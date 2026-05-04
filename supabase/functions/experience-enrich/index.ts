import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

const WIKI_USER_AGENT = 'LeSalon/1.0 (https://lesalon.app contact@lesalon.app)';

interface EnrichInput {
  name: string;
  category: string;
  subcategory: string | null;
  artist_name: string | null;
}

interface EnrichResult {
  description: string | null;
  wikipedia_url: string | null;
  image_url: string | null;
}

const NULL_RESULT: EnrichResult = { description: null, wikipedia_url: null, image_url: null };

// Wikipedia OpenSearch — returns up to `limit` candidate page titles for a query.
async function wikiOpenSearch(query: string): Promise<string[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': WIKI_USER_AGENT, 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    // OpenSearch returns [query, [titles], [descs], [urls]]
    return Array.isArray(data) && Array.isArray(data[1]) ? (data[1] as string[]) : [];
  } catch {
    return [];
  }
}

// Wikipedia REST page summary — returns extract text + canonical URL, or null.
async function wikiSummary(title: string): Promise<EnrichResult> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { 'User-Agent': WIKI_USER_AGENT, 'Accept': 'application/json' } });
    if (!res.ok) return NULL_RESULT;
    const data = await res.json();
    // Skip disambiguation pages — extract is unhelpful
    if (data.type === 'disambiguation') return NULL_RESULT;
    const extract = (data.extract as string | undefined) || '';
    if (!extract) return NULL_RESULT;
    const wikiUrl = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    // Prefer the medium-sized thumbnail (typically 320px wide) over originalimage —
    // page leads can be huge. Both fields share the same shape: { source, width, height }.
    const imageUrl = (data.thumbnail?.source as string | undefined)
      || (data.originalimage?.source as string | undefined)
      || null;
    // Store the full extract — Wikipedia summaries are naturally short (typically
    // 200-800 chars), and a hard char-slice cuts mid-word. The UI clamps visually.
    return {
      description: extract,
      wikipedia_url: wikiUrl,
      image_url: imageUrl,
    };
  } catch {
    return NULL_RESULT;
  }
}

// Routing: pick a sequence of Wikipedia title candidates based on category/subcategory.
function buildQueryCandidates(input: EnrichInput): string[] {
  const { name, category, subcategory, artist_name } = input;
  const cat = (category || '').toLowerCase();
  const sub = subcategory || '';

  // Skip categories we don't enrich
  if (['restaurant', 'cinema', 'exhibition', 'other'].includes(cat)) return [];

  if (cat === 'concert') {
    // Need an artist; otherwise skip (event names are too noisy for Wikipedia).
    if (artist_name && artist_name.trim().length > 0) {
      return [artist_name.trim()];
    }
    return [];
  }

  if (cat === 'theatre') {
    if (!sub) return []; // ambiguous theatre row → skip
    const trimmed = name.trim();
    if (sub === 'Musical')   return [`${trimmed} (musical)`,   trimmed];
    if (sub === 'Play')      return [`${trimmed} (play)`,      trimmed];
    if (sub === 'Opera')     return [`${trimmed} (opera)`,     trimmed];
    if (sub === 'Ballet')    return [`${trimmed} (ballet)`,    trimmed];
    // Stand-up and Concert sub-types of theatre → search the show/event name directly
    if (sub === 'Stand-up' || sub === 'Concert') return [trimmed];
    if (sub === 'Exhibit')   return []; // treat exhibit like exhibition: skip
  }

  return [];
}

async function enrichOne(input: EnrichInput): Promise<EnrichResult> {
  const candidates = buildQueryCandidates(input);
  if (candidates.length === 0) return NULL_RESULT;

  // Try each candidate as a direct page summary first
  for (const candidate of candidates) {
    const direct = await wikiSummary(candidate);
    if (direct.description) return direct;
  }

  // Fall back to OpenSearch on the first candidate (or just the name) and summarise the top match
  const searchQuery = candidates[0] || input.name;
  const titles = await wikiOpenSearch(searchQuery);
  for (const title of titles) {
    const summary = await wikiSummary(title);
    if (summary.description) return summary;
  }

  return NULL_RESULT;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Two auth paths:
    //  1. cron-secret + body{experience_id}  → server-driven (e.g. trigger).
    //     Fetches the row, calls Wikipedia, UPDATES the row directly.
    //  2. JWT + body{name, category, subcategory, artist_name} → frontend.
    //     Returns JSON for the caller to UPDATE.
    const cronSecret = req.headers.get('x-cron-secret');

    if (cronSecret) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', { secret_name: 'cron_secret' });
      const expected = secrets?.[0]?.secret;
      if (!expected || cronSecret !== expected) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json().catch(() => ({}));
      const experienceId = body.experience_id;
      if (!experienceId) {
        return new Response(JSON.stringify({ error: 'experience_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: row, error: rowErr } = await supabaseAdmin
        .from('experiences')
        .select('id, name, category, subcategory, artist_name, wikipedia_description, image_url, enrichment_attempted_at')
        .eq('id', experienceId)
        .single();
      if (rowErr || !row) {
        return new Response(JSON.stringify({ error: 'experience row not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updates: Record<string, unknown> = { enrichment_attempted_at: new Date().toISOString() };
      // Re-fetch when description OR image is missing — both come from the same Wikipedia call.
      if (!row.wikipedia_description || !row.image_url) {
        const result = await enrichOne({
          name: row.name,
          category: row.category,
          subcategory: row.subcategory,
          artist_name: row.artist_name,
        });
        if (result.description) updates.wikipedia_description = result.description;
        if (result.wikipedia_url) updates.wikipedia_url = result.wikipedia_url;
        // Only fill image_url when row currently has none — never overwrite a
        // user-picked or playbill-scanned cover.
        if (result.image_url && !row.image_url) updates.image_url = result.image_url;
      }

      await supabaseAdmin.from('experiences').update(updates).eq('id', experienceId);

      return new Response(
        JSON.stringify({ success: true, experience_id: experienceId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── JWT path (frontend) ─────────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Could not verify user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'experience-enrich',
      p_max_requests: 30,
      p_window_minutes: 1440,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded — max 30 enrichments per 24 hours' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const name = (body.name || '').toString();
    const category = (body.category || '').toString();
    if (!name) {
      return new Response(JSON.stringify({ error: 'name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await enrichOne({
      name,
      category,
      subcategory: body.subcategory || null,
      artist_name: body.artist_name || null,
    });

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('experience-enrich error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
