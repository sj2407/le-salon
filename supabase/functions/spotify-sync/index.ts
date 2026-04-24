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
  ["flamenco", "Spain"], ["fado", "Portugal"], ["spanish", "Spain"],
  ["italian", "Italy"],
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
    const body = await res.text().catch(() => '');
    console.error(`Spotify ${res.status} — ${url.split('?')[0]} — ${body}`);
    return { ok: false, status: res.status };
  }
  return { ok: true, data: await res.json(), status: res.status };
}

// ── Aggregate computation ───────────────────────────────────────────────

function mapGenre(raw: string): string | null {
  const lower = raw.toLowerCase().replace(/-/g, ' '); // normalize hyphens → spaces
  if (GENRE_MAP[lower] !== undefined) return GENRE_MAP[lower];
  for (const [key, mapped] of Object.entries(GENRE_MAP)) {
    if (lower.includes(key) && mapped !== null) return mapped;
  }
  return raw;
}

// Only accept Last.fm tags that map to a recognized genre.
// Filters out descriptive tags: "female vocalists", "seen live", "70s", "chillout", etc.
function isGenreTag(raw: string): boolean {
  const lower = raw.toLowerCase().replace(/-/g, ' ');
  if (GENRE_MAP[lower] !== undefined && GENRE_MAP[lower] !== null) return true;
  for (const [key, mapped] of Object.entries(GENRE_MAP)) {
    if (lower.includes(key) && mapped !== null) return true;
  }
  return false;
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

    // ── 1. Fetch top artists (short_term = last 4 weeks) ───────────────
    let artistsRes = await spotifyFetch(
      `${SPOTIFY_API}/me/top/artists?time_range=short_term&limit=50`,
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
        `${SPOTIFY_API}/me/top/artists?time_range=short_term&limit=50`,
        accessToken
      );
    }

    if (!artistsRes.ok) {
      return new Response(
        JSON.stringify({ error: `Spotify artists API error: ${artistsRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Fetch top tracks (short_term = last 4 weeks) ────────────────
    const tracksRes = await spotifyFetch(
      `${SPOTIFY_API}/me/top/tracks?time_range=short_term&limit=50`,
      accessToken
    );

    if (!tracksRes.ok) {
      return new Response(
        JSON.stringify({ error: `Spotify tracks API error: ${tracksRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. Fetch audio features (optional — graceful if restricted) ─────
    const tracksData = tracksRes.data as {
      items: {
        id: string;
        name: string;
        artists: { name: string }[];
        album: { images: { url: string }[] };
      }[]
    };
    const trackIds = tracksData.items.map(t => t.id).join(',');

    const featuresRes = await spotifyFetch(
      `${SPOTIFY_API}/audio-features?ids=${trackIds}`,
      accessToken
    );

    // ── Compute aggregates ──────────────────────────────────────────────

    const artistsData = artistsRes.data as {
      items: { name: string; images: { url: string }[]; genres: string[] }[]
    };

    // ── Track-based artist scoring ──────────────────────────────────
    // Rank artists by weighted listening signal from top tracks.
    // Primary artist (first listed) gets full credit; rank 1 = weight 1.0, rank N = weight 1/N.
    // This is music-only, future-proof, and works for any user's data.

    // Build artist image lookup from Spotify's affinity list (profile photos when available)
    const artistProfileImages: Record<string, string | null> = {};
    for (const a of artistsData.items) {
      artistProfileImages[a.name] = a.images?.[0]?.url || null;
    }

    const artistScores: Record<string, number> = {};
    const artistAlbumArt: Record<string, string | null> = {}; // fallback image from highest-ranked track

    const totalTracks = tracksData.items.length;
    tracksData.items.forEach((track, i) => {
      const rank = i + 1;
      const weight = (totalTracks + 1 - rank) / totalTracks;
      const primaryArtistName = track.artists[0]?.name;
      if (!primaryArtistName) return;
      artistScores[primaryArtistName] = (artistScores[primaryArtistName] || 0) + weight;
      // Album art from first (highest-ranked) track appearance as image fallback
      if (!artistAlbumArt[primaryArtistName]) {
        artistAlbumArt[primaryArtistName] = track.album?.images?.[0]?.url || null;
      }
    });

    const rankedArtists = Object.entries(artistScores)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => ({
        name,
        // Use Spotify profile photo if available, otherwise track album art
        image_url: artistProfileImages[name] || artistAlbumArt[name] || null,
      }));

    // ── Last.fm enrichment on track-derived artists ─────────────────
    // Only enrich artists who actually appear in listening history.
    // Only accept tags that map to recognised genres (filters "female vocalists" etc.)
    const genreOverrides: Record<string, string[]> = {};
    const { data: lfmSecrets } = await supabaseAdmin.rpc('get_secret', { secret_name: 'lastfm_api_key' });
    const lastfmKey = lfmSecrets?.[0]?.secret || null;
    if (lastfmKey && rankedArtists.length > 0) {
      await Promise.all(rankedArtists.map(async ({ name: artistName }) => {
        try {
          const res = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=artist.getTopTags&artist=${encodeURIComponent(artistName)}&api_key=${lastfmKey}&format=json`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (!res.ok) return;
          const data = await res.json();
          if (data.error) return;
          // Keep all tags — isGenreTag is applied later when building top_genres.
          // Geography detection (REGION_KEYWORDS) needs tags like "french", "bollywood", "indian".
          const tags = (data?.toptags?.tag || [])
            .slice(0, 8)
            .map((t: { name: string }) => t.name.toLowerCase())
            .filter((t: string) => t.length > 0);
          if (tags.length > 0) genreOverrides[artistName] = tags;
        } catch { /* non-blocking per artist */ }
      }));
    }

    // Build top_artists for display — track-ranked, with enriched genres
    const top_artists = rankedArtists.slice(0, 10).map(a => ({
      name: a.name,
      image_url: a.image_url,
      genres: genreOverrides[a.name] || [],
    }));

    // Top 10 tracks for the music section display
    const top_tracks = tracksData.items.slice(0, 10).map(t => ({
      name: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album_image_url: t.album?.images?.[0]?.url || null,
    }));

    // Collect raw genres from track-derived artists only — correct source for genres + geography
    const allRawGenres: string[] = [];
    for (const artist of top_artists) {
      allRawGenres.push(...artist.genres);
    }

    // Map genres and count — only genre-mappable tags (filters "female vocalists", "bollywood" etc. from display)
    // Geography uses allRawGenres directly (no isGenreTag filter) so region tags are preserved.
    const genreCounts: Record<string, number> = {};
    for (const raw of allRawGenres) {
      if (!isGenreTag(raw)) continue; // display filter: keep only recognised genre tags
      const mapped = mapGenre(raw);
      if (!mapped || mapped === raw) continue; // drop unmapped raw strings from display
      genreCounts[mapped] = (genreCounts[mapped] || 0) + 1;
    }
    const top_genres = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);

    const cultural_geography = deriveRegions(allRawGenres);

    // Audio features — raw signal data for portrait-generate (Haiku determines mood holistically)
    let avg_valence: number | null = null;
    let avg_energy: number | null = null;
    let avg_tempo: number | null = null;
    let avg_acousticness: number | null = null;
    let pct_minor: number | null = null;

    if (featuresRes.ok) {
      const featuresData = featuresRes.data as {
        audio_features: ({
          valence: number; energy: number; tempo: number;
          mode: number; acousticness: number;
        } | null)[]
      };
      const validFeatures = featuresData.audio_features.filter(f => f !== null);
      const n = validFeatures.length || 1;
      avg_valence = Math.round(validFeatures.reduce((s, f) => s + f!.valence, 0) / n * 1000) / 1000;
      avg_energy = Math.round(validFeatures.reduce((s, f) => s + f!.energy, 0) / n * 1000) / 1000;
      avg_tempo = Math.round(validFeatures.reduce((s, f) => s + f!.tempo, 0) / n * 10) / 10;
      avg_acousticness = Math.round(validFeatures.reduce((s, f) => s + f!.acousticness, 0) / n * 1000) / 1000;
      pct_minor = Math.round(validFeatures.filter(f => f!.mode === 0).length / n * 1000) / 1000;
    }

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

    const synced_at = new Date().toISOString();

    // ── Atomic upsert ───────────────────────────────────────────────────
    // mood_label and mood_line are owned by portrait-generate (Haiku's holistic judgment).
    // spotify-sync only saves raw music data as input signals for Haiku.
    const { error: upsertError } = await supabaseAdmin
      .from('spotify_profiles')
      .upsert({
        user_id: userId,
        synced_at,
        is_active: true,
        top_artists,
        top_tracks,
        top_genres,
        avg_valence,
        avg_energy,
        avg_tempo,
        pct_minor,
        avg_acousticness,
        listening_mode,
        cultural_geography,
      });

    if (upsertError) {
      console.error('spotify_profiles upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save Spotify data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // After cron sync, chain into portrait-generate with fresh data (fire-and-forget)
    if (cronSecret) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/portrait-generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
          'x-cron-secret': cronSecret,
        },
        body: JSON.stringify({ user_id: userId, manual: false }),
      }).catch(err => console.warn('portrait-generate chain failed:', err));
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
