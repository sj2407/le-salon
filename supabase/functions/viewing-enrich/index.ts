import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

let cachedTmdbKey: string | null = null;

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ\s]/g, '').trim();
}

interface TmdbResult {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  popularity?: number;
}

function scoreResult(item: TmdbResult, searchTitle: string, type: 'tv' | 'movie'): number {
  const target = normalize(searchTitle);
  const result = normalize((type === 'movie' ? item.title : item.name) || '');

  let score = 0;
  if (result === target) score += 5;
  else if (result.startsWith(target) || target.startsWith(result)) score += 3;
  else if (result.includes(target) || target.includes(result)) score += 2;

  if (item.overview) score += 1;
  if (item.poster_path) score += 1;

  const dateField = type === 'movie' ? item.release_date : item.first_air_date;
  if (dateField) score += 1;

  if (item.popularity && item.popularity > 5) score += 0.5;

  return score;
}

interface EnrichmentResult {
  tmdb_id: string | null;
  title: string | null;
  tmdb_overview: string | null;
  tmdb_release_year: number | null;
  cover_url: string | null;
}

async function enrichFromTmdb(title: string, type: 'tv' | 'movie', apiKey: string): Promise<EnrichmentResult> {
  const empty: EnrichmentResult = {
    tmdb_id: null,
    title: null,
    tmdb_overview: null,
    tmdb_release_year: null,
    cover_url: null,
  };
  const encoded = encodeURIComponent(title);
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encoded}&page=1&include_adult=false`,
    { headers: { 'Accept': 'application/json' } }
  );
  if (!tmdbRes.ok) return empty;

  const tmdbData = await tmdbRes.json();
  const items: TmdbResult[] = tmdbData.results || [];
  if (items.length === 0) return empty;

  let best: TmdbResult | null = null;
  let bestScore = -1;
  for (const item of items) {
    const s = scoreResult(item, title, type);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  if (!best) return empty;

  const dateField = type === 'movie' ? best.release_date : best.first_air_date;
  const year = dateField ? parseInt(dateField.slice(0, 4), 10) : null;
  return {
    tmdb_id: best.id?.toString() || null,
    title: (type === 'movie' ? best.title : best.name) || null,
    tmdb_overview: best.overview ? best.overview.slice(0, 600) : null,
    tmdb_release_year: Number.isFinite(year) ? year : null,
    cover_url: best.poster_path ? `${TMDB_IMAGE_BASE}${best.poster_path}` : null,
  };
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

    // Resolve TMDB key once for both code paths
    if (!cachedTmdbKey) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', { secret_name: 'tmdb_api_key' });
      cachedTmdbKey = secrets?.[0]?.secret || null;
    }
    if (!cachedTmdbKey) {
      return new Response(
        JSON.stringify({ error: 'TMDB API key not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Two auth paths:
    // 1. cron-secret + body{viewing_id}  → server-driven (e.g. from sync_review_to_viewing trigger).
    //    Fetches the row, calls TMDB, UPDATES the row directly, returns {success}.
    // 2. JWT + body{title, type}         → frontend-driven. Returns the JSON for the caller to UPDATE.
    const cronSecret = req.headers.get('x-cron-secret');

    if (cronSecret) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', { secret_name: 'cron_secret' });
      const expected = secrets?.[0]?.secret;
      if (!expected || cronSecret !== expected) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const body = await req.json().catch(() => ({}));
      const viewingId = body.viewing_id;
      if (!viewingId) {
        return new Response(JSON.stringify({ error: 'viewing_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: row, error: rowErr } = await supabaseAdmin
        .from('viewing')
        .select('id, title, type, cover_url, tmdb_overview, enrichment_attempted_at')
        .eq('id', viewingId)
        .single();
      if (rowErr || !row) {
        return new Response(JSON.stringify({ error: 'viewing row not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Skip if already enriched (idempotent) — but always set enrichment_attempted_at.
      const updates: Record<string, unknown> = { enrichment_attempted_at: new Date().toISOString() };
      if (!row.tmdb_overview) {
        const result = await enrichFromTmdb(row.title, row.type as 'tv' | 'movie', cachedTmdbKey!);
        if (result.tmdb_id) updates.tmdb_id = result.tmdb_id;
        if (result.tmdb_overview) updates.tmdb_overview = result.tmdb_overview;
        if (result.tmdb_release_year) updates.tmdb_release_year = result.tmdb_release_year;
        // Only overwrite cover if TMDB returned one and the row had nothing yet
        if (result.cover_url && !row.cover_url) updates.cover_url = result.cover_url;
      }

      await supabaseAdmin.from('viewing').update(updates).eq('id', viewingId);

      return new Response(
        JSON.stringify({ success: true, viewing_id: viewingId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── JWT path (frontend) ──────────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Could not verify user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'viewing-enrich',
      p_max_requests: 20,
      p_window_minutes: 1440,
    });
    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded — max 20 enrichments per 24 hours' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, type } = await req.json();
    if (!title || !type) {
      return new Response(
        JSON.stringify({ error: 'title and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!['movie', 'tv'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'type must be movie or tv' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await enrichFromTmdb(title, type as 'tv' | 'movie', cachedTmdbKey!);
    return new Response(
      JSON.stringify({ success: true, ...result, title: result.title || title }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('viewing-enrich error:', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
