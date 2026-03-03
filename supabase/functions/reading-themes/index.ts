import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache Anthropic key across warm invocations
let cachedAnthropicKey: string | null = null;

const SYSTEM_PROMPT =
  'You extract recurring thematic preoccupations from book lists. Return only a JSON array of strings, no preamble.';

interface BookForThemes {
  title: string;
  author: string | null;
  google_books_description: string | null;
}

function buildUserPrompt(books: BookForThemes[]): string {
  const bookLines = books.map(b => {
    const desc = b.google_books_description
      ? ` — ${b.google_books_description.slice(0, 200)}`
      : '';
    return b.author
      ? `"${b.title}" by ${b.author}${desc}`
      : `"${b.title}"${desc}`;
  });

  return `Given these books (all rated 8-10 or reviewed): ${bookLines.join('; ')}

Identify 3-4 recurring thematic preoccupations. Not genre labels — actual themes.
Good examples: "memory & loss", "post-colonial voices", "slow fiction",
"female interiority", "political violence", "the absurd".

Return only a JSON array of strings, no preamble.`;
}

function validateThemes(parsed: unknown): parsed is string[] {
  if (!Array.isArray(parsed)) return false;
  if (parsed.length < 2 || parsed.length > 5) return false;
  return parsed.every(
    (item: unknown) => typeof item === 'string' && item.length > 0 && item.length <= 40
  );
}

function extractJsonArray(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to find a JSON array in the response
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('No JSON array found in response');
  }
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() || '';
}

Deno.serve(async (req: Request) => {
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
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for vault access and profile updates
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // User-scoped client for RLS-protected reads
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Fetch primary-signal books: read + (rating >= 8 OR has a review)
    const { data: booksRaw } = await supabaseUser
      .from('books')
      .select('title, author, google_books_description, rating, review_id')
      .eq('user_id', user_id)
      .eq('status', 'read');

    // Filter in code: rating >= 8 OR review_id IS NOT NULL
    const primaryBooks: BookForThemes[] = (booksRaw || [])
      .filter((b: Record<string, unknown>) => {
        const rating = b.rating != null ? Number(b.rating) : null;
        return (rating != null && rating >= 8) || b.review_id != null;
      })
      .map((b: Record<string, unknown>) => ({
        title: b.title as string,
        author: b.author as string | null,
        google_books_description: b.google_books_description as string | null,
      }));

    // Need at least 3 primary-signal books
    if (primaryBooks.length < 3) {
      return new Response(
        JSON.stringify({
          success: true,
          themes: null,
          message: 'Not enough primary-signal books (need 3)',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we should regenerate: only at threshold crossings (every 3rd book) or first time
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('reading_themes, reading_themes_at')
      .eq('id', user_id)
      .single();

    const hasExistingThemes = profile?.reading_themes_at != null;

    // Regenerate if: first time, OR count is a multiple of 3
    if (hasExistingThemes && primaryBooks.length % 3 !== 0) {
      return new Response(
        JSON.stringify({
          success: true,
          themes: profile?.reading_themes || null,
          message: `Themes current — next regeneration at ${primaryBooks.length + (3 - (primaryBooks.length % 3))} primary-signal books`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    const userPrompt = buildUserPrompt(primaryBooks);

    // First attempt
    let rawResponse = await callAnthropic(cachedAnthropicKey, SYSTEM_PROMPT, userPrompt);
    let parsed: unknown;
    let themes: string[] | null = null;

    try {
      parsed = extractJsonArray(rawResponse);
      if (validateThemes(parsed)) {
        themes = parsed;
      }
    } catch {
      // Will retry below
    }

    // Retry once on failure
    if (!themes) {
      try {
        rawResponse = await callAnthropic(cachedAnthropicKey, SYSTEM_PROMPT, userPrompt);
        parsed = extractJsonArray(rawResponse);
        if (validateThemes(parsed)) {
          themes = parsed;
        }
      } catch {
        // Keep previous themes
      }
    }

    // If both attempts failed, keep previous themes
    if (!themes) {
      return new Response(
        JSON.stringify({
          success: true,
          themes: profile?.reading_themes || null,
          note: 'Theme generation produced invalid output; kept previous themes',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profiles with new themes
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        reading_themes: themes,
        reading_themes_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (updateError) {
      console.warn('profiles update warning:', updateError.message);
    }

    return new Response(
      JSON.stringify({ success: true, themes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    const status = message.includes('Anthropic API error') ? 502 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
