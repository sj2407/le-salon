import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

const TAG_OPTIONS = ['movie', 'book', 'podcast', 'show', 'album', 'performing_arts', 'exhibition', 'other'];

// Cache OpenAI key across warm invocations to avoid vault lookup on every call
let cachedOpenaiKey: string | null = null;

const REVIEW_SYSTEM_PROMPT = `You are a review parser. Extract reviews from the user's spoken transcript.

For each item mentioned, return:
- "title": the name of the media (clean it up, proper capitalization)
- "tag": one of: movie, book, podcast, show, album, performing_arts, exhibition, other
- "rating": a number from 0 to 10 (decimals allowed, e.g. 7.5). If no rating is stated, use 7.0
- "review_text": any opinion or commentary the user expressed about this item, or null if none

The user may speak in English or French. Parse ALL items mentioned.
Return ONLY valid JSON: { "entries": [...] }
Do not include any text outside the JSON.`;

const LISTE_SYSTEM_PROMPT = `You are a discovery list parser. Extract items the user wants to discover, watch, read, listen to, or experience.

For each item mentioned, return:
- "title": the name of the media or experience (clean it up, proper capitalization)
- "tag": one of: movie, book, podcast, show, album, performing_arts, exhibition, other
- "note": any additional context the user mentioned about why or where, or null if none

The user may speak in English or French. Parse ALL items mentioned.
Return ONLY valid JSON: { "entries": [...] }
Do not include any text outside the JSON.`;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT — defense in depth (also enforced by verify_jwt deployment flag)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript: rawTranscript, context } = await req.json();

    if (!rawTranscript || !context) {
      return new Response(
        JSON.stringify({ error: 'transcript and context are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize: strip control characters, collapse whitespace, enforce length limit
    const transcript = String(rawTranscript)
      .slice(0, 5000)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!transcript) {
      return new Response(
        JSON.stringify({ entries: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user from JWT
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

    // Rate limit: 30 per 24 hours
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'parse-dictation',
      p_max_requests: 30,
      p_window_minutes: 1440,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded — max 30 dictations per 24 hours' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = context === 'review' ? REVIEW_SYSTEM_PROMPT : LISTE_SYSTEM_PROMPT;

    // Use cached key or fetch from vault
    if (!cachedOpenaiKey) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', {
        secret_name: 'openai_api_key',
      });
      cachedOpenaiKey = secrets?.[0]?.secret || null;
    }

    if (!cachedOpenaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = cachedOpenaiKey;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI error: ${openaiRes.status} ${errText}`);
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ entries: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(content);
    const entries = (parsed.entries || []).map((entry: Record<string, unknown>) => {
      const tag = TAG_OPTIONS.includes(entry.tag as string) ? entry.tag : 'other';

      if (context === 'review') {
        let rating = parseFloat(String(entry.rating));
        if (isNaN(rating) || rating < 0 || rating > 10) rating = 7.0;
        return {
          title: String(entry.title || '').trim(),
          tag,
          rating: Math.round(rating * 10) / 10,
          review_text: entry.review_text ? String(entry.review_text).trim() : null,
        };
      } else {
        return {
          title: String(entry.title || '').trim(),
          tag,
          note: entry.note ? String(entry.note).trim() : null,
        };
      }
    }).filter((e: Record<string, unknown>) => e.title);

    return new Response(
      JSON.stringify({ entries }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('parse-dictation error:', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
