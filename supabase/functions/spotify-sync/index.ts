import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

/** Constant-time string comparison to prevent timing attacks on shared secrets. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

/**
 * Spotify Sync — fetch top artists, top tracks, audio features;
 * compute aggregates; atomically upsert spotify_profiles.
 *
 * Called after initial Spotify connect and every 30 days via cron.
 * Atomicity: only commit the upsert if all three Spotify API calls succeed.
 *
 * Retry policy on 429/5xx: exponential backoff (1 min, 5 min, 15 min).
 * After 3 retries, log failure. No user alert unless stale >45 days.
 */

const SPOTIFY_API = 'https://api.spotify.com/v1';

// Static genre and region maps — loaded once per warm container
let genreMap: Record<string, string | null> | null = null;
let regionMap: Record<string, string> | null = null;

// Embedded genre map (subset — full map in /data/spotify-genre-map.json)
// In production, these would be fetched from storage or bundled.
// For Edge Functions, we inline the critical mappings.
const GENRE_MAP: Record<string, string | null> = {
  "pop": "Pop", "indie pop": "Indie Pop", "art pop": "Art Pop",
  "chamber pop": "Indie / Alternative", "bedroom pop": "Indie Pop",
  "dream pop": "Dream Pop", "synthpop": "Synth Pop", "dance pop": "Dance Pop",
  "rock": "Rock", "indie rock": "Indie Rock", "alternative rock": "Alternative Rock",
  "classic rock": "Classic Rock", "art rock": "Art Rock", "post-rock": "Post-Rock",
  "psychedelic rock": "Psychedelic Rock", "permanent wave": "Indie / Rock",
  "modern rock": "Alternative Rock", "new wave": "New Wave", "post-punk": "Post-Punk",
  "hip hop": "Hip-Hop", "rap": "Rap", "trap": "Trap",
  "rap français": "Rap Français", "french hip hop": "Rap Français",
  "pop rap": "Pop Rap", "underground hip hop": "Underground Hip-Hop",
  "grime": "Grime", "uk hip hop": "UK Hip-Hop",
  "electronic": "Electronic", "electronica": "Electronic", "house": "House",
  "deep house": "Deep House", "techno": "Techno", "ambient": "Ambient",
  "trip hop": "Trip-Hop", "downtempo": "Downtempo",
  "r&b": "R&B", "neo soul": "Neo Soul", "soul": "Soul", "funk": "Funk",
  "jazz": "Jazz", "contemporary jazz": "Contemporary Jazz", "nu jazz": "Nu Jazz",
  "classical": "Classical", "neo-classical": "Neo-Classical", "minimalism": "Minimalism",
  "folk": "Folk", "indie folk": "Indie Folk", "singer-songwriter": "Singer-Songwriter",
  "americana": "Americana", "country": "Country",
  "metal": "Metal", "shoegaze": "Shoegaze",
  "reggae": "Reggae", "reggaeton": "Reggaeton",
  "afrobeats": "Afrobeats", "afropop": "Afropop", "amapiano": "Amapiano",
  "bossa nova": "Bossa Nova", "mpb": "MPB", "samba": "Samba",
  "k-pop": "K-Pop", "j-pop": "J-Pop", "city pop": "City Pop",
  "latin": "Latin", "latin pop": "Latin Pop", "cumbia": "Cumbia",
  "chanson": "Chanson", "chanson française": "Chanson Française",
  "french pop": "French Pop", "variété française": "Variété Française",
  "arabic pop": "Arabic Pop", "rai": "Raï",
  "flamenco": "Flamenco", "fado": "Fado",
  "lo-fi": "Lo-Fi", "lo-fi beats": "Lo-Fi Beats",
  "experimental": "Experimental", "avant-garde": "Avant-Garde",
  "ccm": null, "worship": null,
};

const REGION_KEYWORDS: [string, string][] = [
  ["français", "France"], ["french", "France"], ["chanson", "France"], ["variété", "France"],
  ["k-pop", "South Korea"], ["korean", "South Korea"],
  ["j-pop", "Japan"], ["j-rock", "Japan"], ["city pop", "Japan"], ["anime", "Japan"],
  ["afrobeats", "West Africa"], ["afropop", "West Africa"], ["afro house", "South Africa"],
  ["amapiano", "South Africa"], ["ethio-jazz", "East Africa"],
  ["bossa nova", "Brazil"], ["mpb", "Brazil"], ["samba", "Brazil"], ["brazilian", "Brazil"],
  ["reggaeton", "Latin America"], ["latin", "Latin America"], ["cumbia", "Latin America"],
  ["arabic", "Arab World"], ["rai", "North Africa"],
  ["turkish", "Turkey"], ["persian", "Iran"],
  ["flamenco", "Spain"], ["fado", "Portugal"],
  ["grime", "United Kingdom"], ["uk", "United Kingdom"],
  ["reggae", "Jamaica"], ["dancehall", "Jamaica"],
  ["bollywood", "India"], ["indian", "India"],
];

// ── Spotify API helpers ─────────────────────────────────────────────────

async function refreshAccessToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const { data: idSecrets } = await supabaseAdmin.rpc('get_secret', {
    secret_name: 'spotify_client_id',
  });
  const { data: secretSecrets } = await supabaseAdmin.rpc('get_secret', {
    secret_name: 'spotify_client_secret',
  });
  const clientId = idSecrets?.[0]?.secret;
  const clientSecret = secretSecrets?.[0]?.secret;
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    console.error('Spotify token refresh failed:', res.status, await res.text());
    return null;
  }

  const data = await res.json();

  // Store rotated tokens
  await supabaseAdmin.from('spotify_tokens').update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // Spotify may not return new refresh token
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return data.access_token;
}

async function spotifyFetch(
  url: string,
  accessToken: string
): Promise<{ ok: boolean; data?: unknown; status: number }> {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  return { ok: true, data: await res.json(), status: res.status };
}

// ── Aggregate computation ───────────────────────────────────────────────

function mapGenre(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (GENRE_MAP[lower] !== undefined) return GENRE_MAP[lower];
  // Try partial matches for compound genres
  for (const [key, mapped] of Object.entries(GENRE_MAP)) {
    if (lower.includes(key) && mapped !== null) return mapped;
  }
  return raw; // Return as-is if no mapping found
}

function deriveRegions(rawGenres: string[]): { region: string; count: number }[] {
  const regionCounts: Record<string, number> = {};
  for (const genre of rawGenres) {
    const lower = genre.toLowerCase();
    for (const [keyword, region] of REGION_KEYWORDS) {
      if (lower.includes(keyword)) {
        regionCounts[region] = (regionCounts[region] || 0) + 1;
        break; // One region per genre
      }
    }
  }
  return Object.entries(regionCounts)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);
}

function classifyMood(valence: number, energy: number): { label: string; line: string } {
  const label =
    valence > 0.6 && energy > 0.6 ? 'Euphoric' :
    valence > 0.6 && energy <= 0.6 ? 'Peaceful' :
    valence <= 0.6 && energy > 0.6 ? 'Intense' :
    'Melancholic';

  // Build mood_line from aggregates
  const parts: string[] = [];
  if (valence <= 0.4) parts.push('minor key');
  else if (valence >= 0.7) parts.push('major key');

  if (energy <= 0.3) parts.push('contemplative');
  else if (energy <= 0.5) parts.push('measured');
  else if (energy >= 0.7) parts.push('high energy');

  return { label, line: parts.join(' · ') || label.toLowerCase() };
}

// ── Main handler ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Determine user_id: cron (with secret) may pass body user_id; clients use JWT
    let userId: string;
    const body = await req.json().catch(() => ({}));
    const cronSecret = req.headers.get('x-cron-secret');

    if (cronSecret) {
      // Cron path — verify the shared secret before trusting body user_id
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', {
        secret_name: 'cron_secret',
      });
      const expectedSecret = secrets?.[0]?.secret;
      if (!expectedSecret || !timingSafeEqual(cronSecret, expectedSecret)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!body.user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id is required for cron calls' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = body.user_id;
    } else {
      // Client path — extract trusted user ID from JWT
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error } = await supabaseUser.auth.getUser();
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Could not verify user' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
      // Reject if body user_id doesn't match JWT (prevent IDOR)
      if (body.user_id && body.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: user_id mismatch' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Rate limit: 10 per 24 hours
    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: userId,
      p_function_name: 'spotify-sync',
      p_max_requests: 10,
      p_window_minutes: 1440,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded — max 10 syncs per 24 hours' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tokens (service_role bypasses RLS)
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('spotify_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: 'No Spotify tokens found. Connect Spotify first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = tokenRow.access_token;

    // ── 1. Fetch top artists ────────────────────────────────────────────
    let artistsRes = await spotifyFetch(
      `${SPOTIFY_API}/me/top/artists?time_range=medium_term&limit=50`,
      accessToken
    );

    // If 401, refresh token and retry
    if (artistsRes.status === 401) {
      const newToken = await refreshAccessToken(supabaseAdmin, userId, tokenRow.refresh_token);
      if (!newToken) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Spotify token' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      accessToken = newToken;
      artistsRes = await spotifyFetch(
        `${SPOTIFY_API}/me/top/artists?time_range=medium_term&limit=50`,
        accessToken
      );
    }

    if (!artistsRes.ok) {
      return new Response(
        JSON.stringify({ error: `Spotify artists API error: ${artistsRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Fetch top tracks ─────────────────────────────────────────────
    const tracksRes = await spotifyFetch(
      `${SPOTIFY_API}/me/top/tracks?time_range=medium_term&limit=50`,
      accessToken
    );

    if (!tracksRes.ok) {
      return new Response(
        JSON.stringify({ error: `Spotify tracks API error: ${tracksRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. Fetch audio features ─────────────────────────────────────────
    const tracksData = tracksRes.data as { items: { id: string; artists: { name: string }[] }[] };
    const trackIds = tracksData.items.map(t => t.id).join(',');

    const featuresRes = await spotifyFetch(
      `${SPOTIFY_API}/audio-features?ids=${trackIds}`,
      accessToken
    );

    if (!featuresRes.ok) {
      return new Response(
        JSON.stringify({ error: `Spotify audio features API error: ${featuresRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── All three calls succeeded — compute aggregates ──────────────────

    const artistsData = artistsRes.data as {
      items: { name: string; images: { url: string }[]; genres: string[] }[]
    };
    const featuresData = featuresRes.data as {
      audio_features: ({
        valence: number; energy: number; tempo: number;
        mode: number; acousticness: number;
      } | null)[]
    };

    // Top 10 artists with image + raw genres
    const top_artists = artistsData.items.slice(0, 10).map(a => ({
      name: a.name,
      image_url: a.images?.[0]?.url || null,
      genres: a.genres || [],
    }));

    // Collect ALL raw genres from ALL 50 artists
    const allRawGenres: string[] = [];
    for (const artist of artistsData.items) {
      allRawGenres.push(...(artist.genres || []));
    }

    // Map genres and count
    const genreCounts: Record<string, number> = {};
    for (const raw of allRawGenres) {
      const mapped = mapGenre(raw);
      if (mapped === null) continue; // Discarded genre
      genreCounts[mapped] = (genreCounts[mapped] || 0) + 1;
    }
    const top_genres = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);

    // Cultural geography — derived from raw genre strings
    const cultural_geography = deriveRegions(allRawGenres);

    // Audio feature averages
    const validFeatures = featuresData.audio_features.filter(f => f !== null);
    const n = validFeatures.length || 1;

    const avg_valence = validFeatures.reduce((s, f) => s + f!.valence, 0) / n;
    const avg_energy = validFeatures.reduce((s, f) => s + f!.energy, 0) / n;
    const avg_tempo = validFeatures.reduce((s, f) => s + f!.tempo, 0) / n;
    const avg_acousticness = validFeatures.reduce((s, f) => s + f!.acousticness, 0) / n;
    const pct_minor = validFeatures.filter(f => f!.mode === 0).length / n;

    // Listening mode: "immersion" if top 5 artists account for >60% of top tracks
    const trackArtistCounts: Record<string, number> = {};
    for (const track of tracksData.items) {
      for (const artist of track.artists) {
        trackArtistCounts[artist.name] = (trackArtistCounts[artist.name] || 0) + 1;
      }
    }
    const topFiveArtists = Object.entries(trackArtistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const topFiveTotal = topFiveArtists.reduce((s, [, c]) => s + c, 0);
    const listening_mode = (topFiveTotal / tracksData.items.length) > 0.6 ? 'immersion' : 'explorer';

    // Mood classification
    const { label: mood_label, line: mood_line } = classifyMood(avg_valence, avg_energy);

    const synced_at = new Date().toISOString();

    // ── Atomic upsert ───────────────────────────────────────────────────
    const { error: upsertError } = await supabaseAdmin
      .from('spotify_profiles')
      .upsert({
        user_id: userId,
        synced_at,
        is_active: true,
        top_artists,
        top_genres,
        avg_valence: Math.round(avg_valence * 1000) / 1000,
        avg_energy: Math.round(avg_energy * 1000) / 1000,
        avg_tempo: Math.round(avg_tempo * 10) / 10,
        pct_minor: Math.round(pct_minor * 1000) / 1000,
        avg_acousticness: Math.round(avg_acousticness * 1000) / 1000,
        listening_mode,
        cultural_geography,
        mood_label,
        mood_line,
      });

    if (upsertError) {
      console.error('spotify_profiles upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save Spotify data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, synced_at }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('spotify-sync error:', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
