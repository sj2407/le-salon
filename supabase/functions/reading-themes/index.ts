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
  id: string;
  title: string;
  author: string | null;
  google_books_description: string | null;
}

// Warm palette that matches the app's aesthetic
const THEME_COLORS = [
  '#C97B63', // terracotta
  '#7BA78A', // sage
  '#8B7DAE', // lavender
  '#CDA74E', // gold
  '#6B9BC3', // slate blue
];

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

function extractJson(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to find a JSON array or object in the response
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]); } catch { /* fall through */ }
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
    }
    throw new Error('No JSON found in response');
  }
}

const GRAPH_SYSTEM_PROMPT =
  'You map books to thematic preoccupations. Return only valid JSON, no preamble.';

function buildGraphPrompt(
  books: BookForThemes[],
  themes: string[]
): string {
  const bookLines = books.map((b, i) =>
    `${i}: "${b.title}"${b.author ? ` by ${b.author}` : ''}`
  );

  return `Books:\n${bookLines.join('\n')}

Themes: ${JSON.stringify(themes)}

For each book, list which themes it connects to (1-3 themes per book). Every theme must have at least 1 book.

Return JSON: {"mapping": {"0": ["theme1", "theme2"], "1": ["theme2"], ...}}
Keys are book indices (as strings), values are arrays of theme strings from the list above.`;
}

interface GraphMapping {
  mapping: Record<string, string[]>;
}

function validateGraphMapping(parsed: unknown, bookCount: number, themes: string[]): parsed is GraphMapping {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  if (!obj.mapping || typeof obj.mapping !== 'object') return false;
  const mapping = obj.mapping as Record<string, unknown>;
  // At least half the books should be mapped
  if (Object.keys(mapping).length < Math.min(2, bookCount)) return false;
  const themeSet = new Set(themes);
  for (const [key, val] of Object.entries(mapping)) {
    if (isNaN(Number(key)) || Number(key) >= bookCount) return false;
    if (!Array.isArray(val)) return false;
    for (const t of val) {
      if (typeof t !== 'string' || !themeSet.has(t)) return false;
    }
  }
  return true;
}

function buildReadingGraph(
  books: BookForThemes[],
  themes: string[],
  mapping: Record<string, string[]>
): { themes: { id: string; label: string; color: string }[]; edges: { book_id: string; theme_id: string }[] } {
  // Create theme nodes with stable IDs and colors
  const themeNodes = themes.map((label, i) => ({
    id: `theme-${i}`,
    label,
    color: THEME_COLORS[i % THEME_COLORS.length],
  }));

  const themeLabelToId: Record<string, string> = {};
  themeNodes.forEach(t => { themeLabelToId[t.label] = t.id; });

  // Build edges from mapping
  const edges: { book_id: string; theme_id: string }[] = [];
  for (const [indexStr, themeLabels] of Object.entries(mapping)) {
    const bookIndex = Number(indexStr);
    const book = books[bookIndex];
    if (!book) continue;
    for (const label of themeLabels) {
      const themeId = themeLabelToId[label];
      if (themeId) {
        edges.push({ book_id: book.id, theme_id: themeId });
      }
    }
  }

  return { themes: themeNodes, edges };
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 100
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
      max_tokens: maxTokens,
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
      .select('id, title, author, google_books_description, rating, review_id')
      .eq('user_id', user_id)
      .eq('status', 'read');

    // Filter in code: rating >= 8 OR review_id IS NOT NULL
    const primaryBooks: BookForThemes[] = (booksRaw || [])
      .filter((b: Record<string, unknown>) => {
        const rating = b.rating != null ? Number(b.rating) : null;
        return (rating != null && rating >= 8) || b.review_id != null;
      })
      .map((b: Record<string, unknown>) => ({
        id: b.id as string,
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
      .select('reading_themes, reading_themes_at, reading_graph')
      .eq('id', user_id)
      .single();

    const hasExistingThemes = profile?.reading_themes_at != null;
    const hasExistingGraph = profile?.reading_graph?.themes?.length > 0;

    // Regenerate if: first time, OR count is a multiple of 3, OR themes exist but graph is missing
    const needsGraphOnly = hasExistingThemes && !hasExistingGraph && profile?.reading_themes?.length > 0;
    if (hasExistingThemes && !needsGraphOnly && primaryBooks.length % 3 !== 0) {
      return new Response(
        JSON.stringify({
          success: true,
          themes: profile?.reading_themes || null,
          reading_graph: profile?.reading_graph || null,
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

    // Skip theme generation if we only need the graph
    let themes: string[] | null = null;
    if (!needsGraphOnly) {
      // First attempt
      let rawResponse = await callAnthropic(cachedAnthropicKey, SYSTEM_PROMPT, userPrompt);
      let parsed: unknown;

      try {
        parsed = extractJson(rawResponse);
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
          parsed = extractJson(rawResponse);
          if (validateThemes(parsed)) {
            themes = parsed;
          }
        } catch {
          // Keep previous themes
        }
      }
    }

    // If generating graph only (themes already exist), use existing themes
    const finalThemes = themes || (needsGraphOnly ? profile?.reading_themes : null);
    if (!finalThemes) {
      return new Response(
        JSON.stringify({
          success: true,
          themes: profile?.reading_themes || null,
          reading_graph: profile?.reading_graph || null,
          note: 'Theme generation produced invalid output; kept previous themes',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Generate reading graph (book→theme mapping) ---
    let readingGraph = null;
    try {
      const graphPrompt = buildGraphPrompt(primaryBooks, finalThemes);
      let graphRaw = await callAnthropic(
        cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, graphPrompt, 300
      );
      let graphParsed = extractJson(graphRaw);

      if (!validateGraphMapping(graphParsed, primaryBooks.length, finalThemes)) {
        // Retry once
        graphRaw = await callAnthropic(
          cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, graphPrompt, 300
        );
        graphParsed = extractJson(graphRaw);
      }

      if (validateGraphMapping(graphParsed, primaryBooks.length, finalThemes)) {
        readingGraph = buildReadingGraph(
          primaryBooks, finalThemes, (graphParsed as GraphMapping).mapping
        );
      }
    } catch (err) {
      console.warn('Graph generation failed:', (err as Error).message);
    }

    // Update profiles with themes and graph
    const updatePayload: Record<string, unknown> = {
      reading_themes_at: new Date().toISOString(),
    };
    if (themes) {
      updatePayload.reading_themes = themes;
    }
    if (readingGraph) {
      updatePayload.reading_graph = readingGraph;
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', user_id);

    if (updateError) {
      console.warn('profiles update warning:', updateError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        themes: finalThemes,
        reading_graph: readingGraph,
      }),
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
