import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

let cachedTmdbKey: string | null = null;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Rate limit: 50 per 24 hours
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'cover-search',
      p_max_requests: 50,
      p_window_minutes: 1440,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded — max 50 searches per 24 hours' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, type } = await req.json();

    if (!query || !type) {
      return new Response(
        JSON.stringify({ error: 'query and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['movie', 'tv'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'type must be movie or tv' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch TMDB key from vault (cached across warm invocations)
    if (!cachedTmdbKey) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', {
        secret_name: 'tmdb_api_key',
      });
      cachedTmdbKey = secrets?.[0]?.secret || null;
    }

    if (!cachedTmdbKey) {
      return new Response(
        JSON.stringify({ error: 'TMDB API key not configured. Add tmdb_api_key to Vault.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encoded = encodeURIComponent(query);
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/search/${type}?query=${encoded}&page=1&include_adult=false`,
      {
        headers: {
          'Authorization': `Bearer ${cachedTmdbKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!tmdbRes.ok) {
      return new Response(
        JSON.stringify({ error: `TMDB API error: ${tmdbRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tmdbData = await tmdbRes.json();

    const results = (tmdbData.results || []).slice(0, 8).map((item: any) => ({
      id: item.id?.toString(),
      title: type === 'movie' ? item.title : item.name,
      subtitle: [
        type === 'movie' ? item.release_date?.slice(0, 4) : item.first_air_date?.slice(0, 4),
        item.original_language !== 'en' ? (item.original_title || item.original_name) : null
      ].filter(Boolean).join(' · '),
      imageUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
        : ''
    })).filter((r: any) => r.imageUrl);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('cover-search error:', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
