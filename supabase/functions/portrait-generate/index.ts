import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

// Cache Anthropic key across warm invocations
let cachedAnthropicKey: string | null = null;

const SYSTEM_PROMPT = `You are writing a cultural taste portrait for a private social app called Le Salon.
Tone: warm, perceptive, slightly literary — like a thoughtful friend who notices things.
Never use the word "data". Never list statistics. Write in second person. Max 3 sentences.`;

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
}

function buildUserPrompt(
  spotify: SpotifyProfile | null,
  primaryBooks: BookWithReview[],
  contextBooks: BookWithReview[]
): string {
  const parts: string[] = [];

  if (spotify) {
    if (spotify.mood_label) {
      parts.push(`Mood: ${spotify.mood_label}`);
    }

    const topGenres = (spotify.top_genres || [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(g => g.genre);
    if (topGenres.length > 0) {
      parts.push(`Music — top genres: ${topGenres.join(', ')}`);
    }

    const topArtists = (spotify.top_artists || [])
      .slice(0, 5)
      .map(a => a.name);
    if (topArtists.length > 0) {
      parts.push(`Music — top artists: ${topArtists.join(', ')}`);
    }

    const musicDetails: string[] = [];
    if (spotify.pct_minor != null) musicDetails.push(`% minor key: ${Math.round(spotify.pct_minor * 100)}%`);
    if (spotify.avg_tempo != null) musicDetails.push(`avg tempo: ${Math.round(spotify.avg_tempo)} BPM`);
    if (spotify.avg_acousticness != null) musicDetails.push(`acousticness: ${spotify.avg_acousticness.toFixed(2)}`);
    if (spotify.listening_mode) musicDetails.push(`mode: ${spotify.listening_mode}`);
    if (musicDetails.length > 0) {
      parts.push(`Music — ${musicDetails.join(', ')}`);
    }

    const topRegions = (spotify.cultural_geography || [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(r => r.region);
    if (topRegions.length > 0) {
      parts.push(`Music — cultural geography: ${topRegions.join(', ')}`);
    }
  }

  if (primaryBooks.length > 0) {
    const bookList = primaryBooks
      .map(b => b.author ? `${b.title} by ${b.author}` : b.title)
      .join(', ');
    parts.push(`Reading — primary signal books (rated 8-10 or reviewed): ${bookList}`);
  }

  if (contextBooks.length > 0) {
    const bookList = contextBooks
      .map(b => b.author ? `${b.title} by ${b.author}` : b.title)
      .join(', ');
    parts.push(`Reading — context books (currently reading, background): ${bookList}`);
  }

  parts.push(
    `\nWrite a portrait capturing the emotional and aesthetic texture of this person's ` +
    `cultural life. Find the thread connecting music and reading if one exists. ` +
    `Never mention numbers.`
  );

  return parts.join('\n');
}

function categorizeBooks(books: BookWithReview[]): {
  primary: BookWithReview[];
  context: BookWithReview[];
} {
  const primary: BookWithReview[] = [];
  const context: BookWithReview[] = [];

  for (const book of books) {
    const rating = book.rating != null ? Number(book.rating) : null;
    const hasReview = book.review_text != null && book.review_text.trim().length > 0;

    // Rating 8-10: PRIMARY signal
    if (rating != null && rating >= 8) {
      primary.push(book);
      continue;
    }

    // Rating 5-7 without review: DEPRIORITIZED (skip)
    // Rating 5-7 with review: include as primary (the review adds signal)
    if (rating != null && rating >= 5 && rating <= 7) {
      if (hasReview) {
        primary.push(book);
      }
      continue;
    }

    // Rating 1-4 without review: EXCLUDED
    // Rating 1-4 with review: INCLUDED as primary (negative signal is still signal)
    if (rating != null && rating >= 1 && rating <= 4) {
      if (hasReview) {
        primary.push(book);
      }
      continue;
    }

    // Currently reading: CONTEXT only
    if (book.status === 'reading') {
      context.push(book);
      continue;
    }

    // Bookshelf import + unrated: BACKGROUND context only
    if (book.source === 'bookshelf_import' && (rating == null || rating === 0)) {
      context.push(book);
      continue;
    }

    // Unrated (0 or null): DEPRIORITIZED (skip)
  }

  return { primary, context };
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() || null;
  return text;
}

function validatePortrait(text: string | null): boolean {
  if (!text) return false;
  return text.length >= 80 && text.length <= 400;
}

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

    const jwt = authHeader.replace('Bearer ', '');

    // User-scoped client — extract trusted user ID from JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id; // TRUSTED — from JWT
    const { manual } = await req.json();

    // Admin client for cross-user reads (spotify_profiles) and vault access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate limit: 2 per 24 hours
    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: userId,
      p_function_name: 'portrait-generate',
      p_max_requests: 2,
      p_window_minutes: 1440,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded — max 2 generations per 24 hours' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Spotify profile
    const { data: spotifyRow } = await supabaseAdmin
      .from('spotify_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const spotify: SpotifyProfile | null = spotifyRow || null;

    // If manual, enforce 7-day cooldown
    if (manual && spotify?.last_portrait_manual_at) {
      const lastManual = new Date(spotify.last_portrait_manual_at);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (lastManual > sevenDaysAgo) {
        const nextAllowed = new Date(lastManual.getTime() + 7 * 24 * 60 * 60 * 1000);
        return new Response(
          JSON.stringify({
            error: 'Manual regeneration available once per week',
            next_allowed_at: nextAllowed.toISOString(),
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch books with optional review text via left join
    const { data: booksRaw } = await supabaseUser
      .from('books')
      .select('id, title, author, status, source, rating, review_id, reviews(review_text)')
      .eq('user_id', userId);

    const books: BookWithReview[] = (booksRaw || []).map((b: Record<string, unknown>) => ({
      id: b.id as string,
      title: b.title as string,
      author: b.author as string | null,
      status: b.status as string,
      source: b.source as string,
      rating: b.rating as number | null,
      review_id: b.review_id as string | null,
      review_text: (b.reviews as Record<string, unknown> | null)?.review_text as string | null,
    }));

    const { primary: primaryBooks, context: contextBooks } = categorizeBooks(books);

    const hasSpotify = spotify != null && (
      (spotify.top_genres && spotify.top_genres.length > 0) ||
      (spotify.top_artists && spotify.top_artists.length > 0)
    );
    const hasBooks = primaryBooks.length > 0 || contextBooks.length > 0;

    if (!hasSpotify && !hasBooks) {
      return new Response(
        JSON.stringify({ error: 'No music or reading data available to generate a portrait' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Anthropic API key from vault
    if (!cachedAnthropicKey) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', {
        secret_name: 'anthropic_api_key',
      });
      cachedAnthropicKey = secrets?.[0]?.secret || null;
    }

    if (!cachedAnthropicKey) {
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = buildUserPrompt(
      hasSpotify ? spotify : null,
      primaryBooks,
      contextBooks
    );

    // First attempt
    let portraitText = await callAnthropic(cachedAnthropicKey, SYSTEM_PROMPT, userPrompt);

    // Validate — retry once if invalid
    if (!validatePortrait(portraitText)) {
      portraitText = await callAnthropic(cachedAnthropicKey, SYSTEM_PROMPT, userPrompt);
    }

    // If still invalid after retry, keep previous portrait
    if (!validatePortrait(portraitText)) {
      if (spotify?.portrait_text) {
        return new Response(
          JSON.stringify({
            success: true,
            portrait_text: spotify.portrait_text,
            mood_label: spotify.mood_label,
            mood_line: spotify.mood_line,
            note: 'Generation produced invalid output; kept previous portrait',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Portrait generation failed — output did not meet length requirements' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update spotify_profiles with the new portrait
    const updateFields: Record<string, unknown> = {
      portrait_text: portraitText,
      portrait_generated_at: new Date().toISOString(),
    };
    if (manual) {
      updateFields.last_portrait_manual_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('spotify_profiles')
      .update(updateFields)
      .eq('user_id', userId);

    if (updateError) {
      // If no spotify row exists (books-only user), the update silently affects 0 rows.
      // That's fine — the portrait is still returned to the caller.
      console.warn('spotify_profiles update warning:', updateError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        portrait_text: portraitText,
        mood_label: spotify?.mood_label || null,
        mood_line: spotify?.mood_line || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    // Distinguish external API failures from internal errors
    const message = (err as Error).message || 'Unknown error';
    console.error('portrait-generate error:', err);
    const status = message.includes('Anthropic API error') ? 502 : 500;
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
