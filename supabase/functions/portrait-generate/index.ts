import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

let cachedAnthropicKey: string | null = null;

// Haiku returns structured JSON: { mood, portrait }
// mood is one of four labels; portrait is 2-3 sentences of literary prose.
const SYSTEM_PROMPT = `You are creating a monthly cultural portrait for Le Salon, a private social app.

Given a person's cultural life this month — music listening, books read, experiences attended, things created — respond with a JSON object containing exactly two fields:
- "mood": exactly one word from this list [Euphoric, Peaceful, Intense, Melancholic] capturing the overall emotional and aesthetic texture of their entire cultural month. Consider ALL activities, not just music.
- "portrait": 2-3 sentences in second person. Warm, perceptive, slightly literary — like a thoughtful friend who notices patterns. The #1 ranked artist and top book are the strongest signals — weight them most heavily. Find the thread connecting the most dominant choices. Never use the word "data". Never list statistics.

If a previous portrait is provided, write something genuinely different — new angle, new observations, different thread. Do not repeat artists, books, or themes already mentioned.

Return only valid JSON. No text outside the JSON object.`;

const VALID_MOODS = ['Euphoric', 'Peaceful', 'Intense', 'Melancholic'];

interface SpotifyProfile {
  user_id: string;
  top_artists: { name: string; image_url: string; genres: string[] }[];
  top_genres: { genre: string; count: number }[];
  avg_valence: number | null;
  avg_energy: number | null;
  avg_tempo: number | null;
  pct_minor: number | null;
  avg_acousticness: number | null;
  listening_mode: string | null;
  cultural_geography: { region: string; count: number }[];
  mood_label: string | null;
  mood_line: string | null;
  portrait_text: string | null;
  portrait_generated_at: string | null;
  last_portrait_manual_at: string | null;
}

interface BookWithReview {
  id: string;
  title: string;
  author: string | null;
  status: string;
  source: string;
  rating: number | null;
  review_id: string | null;
  review_text: string | null;
  date_read: string | null;
  created_at: string;
}

interface Experience {
  name: string;
  category: string | null;
  date: string | null;
  city: string | null;
  note: string | null;
}

interface Creation {
  type: string;
  title: string | null;
  text_content: string | null;
}

const BATCH_SOURCES = ['bookshelf_import', 'goodreads_csv'];

function filterRecentBooks(books: BookWithReview[]): BookWithReview[] {
  const ninety = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const oneEighty = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  const tierA = books.filter(b => b.status === 'reading');
  const tierB = books.filter(b =>
    b.status !== 'reading' && b.date_read != null && new Date(b.date_read) >= ninety
  );
  const tierC = books.filter(b =>
    b.status !== 'reading' && b.date_read == null &&
    !BATCH_SOURCES.includes(b.source) && new Date(b.created_at) >= ninety
  );

  const result = [...tierA, ...tierB, ...tierC];
  if (result.length >= 2) return result;

  // Fallback: expand to 180 days if fewer than 2 books passed the 90-day filter
  const tierB2 = books.filter(b =>
    b.status !== 'reading' && b.date_read != null &&
    new Date(b.date_read) >= oneEighty && !tierB.some(x => x.id === b.id)
  );
  const tierC2 = books.filter(b =>
    b.status !== 'reading' && b.date_read == null &&
    !BATCH_SOURCES.includes(b.source) &&
    new Date(b.created_at) >= oneEighty && !tierC.some(x => x.id === b.id)
  );
  return [...result, ...tierB2, ...tierC2];
}

function buildUserPrompt(
  spotify: SpotifyProfile | null,
  primaryBooks: BookWithReview[],
  contextBooks: BookWithReview[],
  experiences: Experience[],
  creations: Creation[],
  previousPortrait: string | null
): string {
  const parts: string[] = [];

  if (spotify) {
    // top_artists is always short_term (last 4 weeks) since the sync was updated
    const topArtists = (spotify.top_artists || []).slice(0, 3);
    if (topArtists.length > 0) {
      topArtists.forEach((a, i) => {
        const tag = i === 0 ? ' (strongest signal, last 4 weeks)' : '';
        parts.push(`Music — artist #${i + 1}${tag}: ${a.name}`);
      });
    }

    const topGenres = (spotify.top_genres || []).sort((a, b) => b.count - a.count).slice(0, 3).map(g => g.genre);
    if (topGenres.length > 0) parts.push(`Music — top genres: ${topGenres.join(', ')}`);

    const topRegions = (spotify.cultural_geography || []).sort((a, b) => b.count - a.count).slice(0, 3).map(r => r.region);
    if (topRegions.length > 0) parts.push(`Music — cultural geography: ${topRegions.join(', ')}`);

    const musicDetails: string[] = [];
    if (spotify.pct_minor != null) musicDetails.push(`${Math.round(spotify.pct_minor * 100)}% minor key`);
    if (spotify.avg_tempo != null) musicDetails.push(`avg tempo ${Math.round(spotify.avg_tempo)} BPM`);
    if (spotify.avg_acousticness != null) musicDetails.push(`acousticness ${spotify.avg_acousticness.toFixed(2)}`);
    if (spotify.listening_mode) musicDetails.push(`listening mode: ${spotify.listening_mode}`);
    if (musicDetails.length > 0) parts.push(`Music — ${musicDetails.join(', ')}`);
  }

  if (primaryBooks.length > 0) {
    const bookList = primaryBooks.map(b => b.author ? `${b.title} by ${b.author}` : b.title).join(', ');
    parts.push(`Reading — primary books (highly rated or reviewed): ${bookList}`);
  }

  if (contextBooks.length > 0) {
    const bookList = contextBooks.map(b => b.author ? `${b.title} by ${b.author}` : b.title).join(', ');
    parts.push(`Reading — context books (currently reading or background): ${bookList}`);
  }

  if (experiences.length > 0) {
    const expList = experiences.map(e => {
      let desc = e.name;
      if (e.category) desc += ` (${e.category})`;
      if (e.city) desc += ` in ${e.city}`;
      if (e.note) desc += ` — ${e.note.slice(0, 80)}`;
      return desc;
    }).join('; ');
    parts.push(`Experiences attended: ${expList}`);
  }

  if (creations.length > 0) {
    const creationList = creations.map(c => {
      if (c.type === 'text') {
        const title = c.title || 'untitled';
        const snippet = c.text_content ? ` — "${c.text_content.slice(0, 60)}..."` : '';
        return `${title}${snippet}`;
      }
      return c.title || 'visual work';
    }).join('; ');
    parts.push(`Created this month: ${creationList}`);
  }

  if (previousPortrait) {
    parts.push(`\nPrevious portrait (do NOT repeat — find a different angle, different thread, different observations):\n"${previousPortrait}"`);
  }

  parts.push(
    `\nReturn the JSON object with mood and portrait.`
  );

  return parts.join('\n');
}

function categorizeBooks(books: BookWithReview[]): { primary: BookWithReview[]; context: BookWithReview[] } {
  const primary: BookWithReview[] = [];
  const context: BookWithReview[] = [];

  for (const book of books) {
    const rating = book.rating != null ? Number(book.rating) : null;
    const hasReview = book.review_text != null && book.review_text.trim().length > 0;

    if (rating != null && rating >= 8) { primary.push(book); continue; }
    if (rating != null && rating >= 5 && rating <= 7) { if (hasReview) primary.push(book); continue; }
    if (rating != null && rating >= 1 && rating <= 4) { if (hasReview) primary.push(book); continue; }
    if (book.status === 'reading') { context.push(book); continue; }
    if (book.source === 'bookshelf_import' && (rating == null || rating === 0)) { context.push(book); continue; }
  }

  return { primary, context };
}

async function callAnthropic(apiKey: string, userPrompt: string): Promise<{ mood: string; portrait: string } | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = (data.content?.[0]?.text || '').trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return {
      mood: parsed.mood,
      portrait: parsed.portrait,
    };
  } catch {
    return null;
  }
}

function validateResponse(result: { mood: string; portrait: string } | null): boolean {
  if (!result) return false;
  if (!VALID_MOODS.includes(result.mood)) return false;
  if (!result.portrait || result.portrait.length < 60 || result.portrait.length > 700) return false;
  return true;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const manual = body.manual ?? false;

    let userId: string;
    let isCronCall = false;
    let supabaseUser: ReturnType<typeof createClient> | null = null;

    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', { secret_name: 'cron_secret' });
      const expectedSecret = secrets?.[0]?.secret;
      if (!expectedSecret || cronSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!body.user_id) {
        return new Response(JSON.stringify({ error: 'user_id required for cron calls' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      userId = body.user_id;
      isCronCall = true;
    } else {
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const jwt = authHeader.replace('Bearer ', '');
      supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
      );
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      userId = user.id;
    }

    if (!isCronCall) {
      const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
        p_user_id: userId,
        p_function_name: 'portrait-generate',
        p_max_requests: 2,
        p_window_minutes: 1440,
      });
      if (allowed === false) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded — max 2 generations per 24 hours' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const { data: spotifyRow } = await supabaseAdmin.from('spotify_profiles').select('*').eq('user_id', userId).single();
    const spotify: SpotifyProfile | null = spotifyRow || null;

    if (manual && spotify?.last_portrait_manual_at) {
      const lastManual = new Date(spotify.last_portrait_manual_at);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (lastManual > sevenDaysAgo) {
        const nextAllowed = new Date(lastManual.getTime() + 7 * 24 * 60 * 60 * 1000);
        return new Response(JSON.stringify({ error: 'Manual regeneration available once per week', next_allowed_at: nextAllowed.toISOString() }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Fetch all cultural data using admin client (cron) or user client (JWT)
    const dataClient = supabaseUser ?? supabaseAdmin;

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [booksRes, experiencesRes, creationsRes] = await Promise.all([
      dataClient
        .from('books')
        .select('id, title, author, status, source, rating, review_id, date_read, created_at, reviews(review_text)')
        .eq('user_id', userId),
      supabaseAdmin
        .from('experiences')
        .select('name, category, date, city, note')
        .eq('user_id', userId)
        .or(`date.gte.${sixtyDaysAgo},and(date.is.null,created_at.gte.${new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()})`)
        .order('date', { ascending: false, nullsFirst: false })
        .limit(20),
      supabaseAdmin
        .from('creations')
        .select('type, title, text_content')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const allBooks: BookWithReview[] = (booksRes.data || []).map((b: Record<string, unknown>) => ({
      id: b.id as string,
      title: b.title as string,
      author: b.author as string | null,
      status: b.status as string,
      source: b.source as string,
      rating: b.rating as number | null,
      review_id: b.review_id as string | null,
      review_text: (b.reviews as Record<string, unknown> | null)?.review_text as string | null,
      date_read: b.date_read as string | null,
      created_at: b.created_at as string,
    }));

    const books = filterRecentBooks(allBooks);

    const experiences: Experience[] = (experiencesRes.data || []).map((e: Record<string, unknown>) => ({
      name: e.name as string,
      category: e.category as string | null,
      date: e.date as string | null,
      city: e.city as string | null,
      note: e.note as string | null,
    }));

    const creations: Creation[] = (creationsRes.data || []).map((c: Record<string, unknown>) => ({
      type: c.type as string,
      title: c.title as string | null,
      text_content: c.text_content as string | null,
    }));

    const { primary: primaryBooks, context: contextBooks } = categorizeBooks(books);

    const hasSpotify = spotify != null && (
      (spotify.top_artists && spotify.top_artists.length > 0) ||
      (spotify.top_genres && spotify.top_genres.length > 0)
    );
    const hasBooks = primaryBooks.length > 0 || contextBooks.length > 0;
    const hasExperiences = experiences.length > 0;
    const hasCreations = creations.length > 0;

    if (!hasSpotify && !hasBooks && !hasExperiences && !hasCreations) {
      return new Response(JSON.stringify({ error: 'No cultural data available to generate a portrait' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!cachedAnthropicKey) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', { secret_name: 'anthropic_api_key' });
      cachedAnthropicKey = secrets?.[0]?.secret || null;
    }

    if (!cachedAnthropicKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userPrompt = buildUserPrompt(
      hasSpotify ? spotify : null,
      primaryBooks,
      contextBooks,
      experiences,
      creations,
      spotify?.portrait_text || null
    );

    let result = await callAnthropic(cachedAnthropicKey, userPrompt);
    if (!validateResponse(result)) {
      result = await callAnthropic(cachedAnthropicKey, userPrompt);
    }

    if (!validateResponse(result)) {
      if (spotify?.portrait_text) {
        return new Response(JSON.stringify({
          success: true,
          portrait_text: spotify.portrait_text,
          mood_label: spotify.mood_label,
          mood_line: spotify.mood_line,
          note: 'Generation produced invalid output; kept previous portrait',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'Portrait generation failed — invalid output' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const updateFields: Record<string, unknown> = {
      portrait_text: result!.portrait,
      portrait_generated_at: new Date().toISOString(),
      mood_label: result!.mood,
      mood_line: null, // mood_line is now derived by Haiku holistically; not a formula-based descriptor
    };
    if (manual) updateFields.last_portrait_manual_at = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('spotify_profiles')
      .update(updateFields)
      .eq('user_id', userId);

    if (updateError) {
      console.warn('spotify_profiles update warning:', updateError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      portrait_text: result!.portrait,
      mood_label: result!.mood,
      mood_line: null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    console.error('portrait-generate error:', err);
    const status = message.includes('Anthropic API error') ? 502 : 500;
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
