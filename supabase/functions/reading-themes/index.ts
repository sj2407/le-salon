import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

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

// ── Incremental graph prompt — only new books, existing themes ──────

function buildIncrementalGraphPrompt(
  newBooks: BookForThemes[],
  existingThemes: string[]
): string {
  const bookLines = newBooks.map((b, i) =>
    `${i}: "${b.title}"${b.author ? ` by ${b.author}` : ''}${
      b.google_books_description ? ` — ${b.google_books_description.slice(0, 200)}` : ''
    }`
  );

  return `Existing themes: ${JSON.stringify(existingThemes)}

New books to map:
${bookLines.join('\n')}

For each new book, list which existing themes it connects to (1-3 themes per book).
If a book doesn't fit any theme well, map it to the single closest theme.

Return JSON: {"mapping": {"0": ["theme1", "theme2"], ...}}
Keys are book indices (as strings), values are arrays of theme strings from the existing themes list.`;
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

// ── Merge incremental edges into existing graph ─────────────────────

function mergeIncrementalEdges(
  existingGraph: { themes: { id: string; label: string; color: string }[]; edges: { book_id: string; theme_id: string }[] },
  newBooks: BookForThemes[],
  mapping: Record<string, string[]>,
  primaryBookIds: Set<string>
): { themes: { id: string; label: string; color: string }[]; edges: { book_id: string; theme_id: string }[] } {
  // Build label-to-id map from existing theme nodes (preserves stable IDs)
  const themeLabelToId: Record<string, string> = {};
  existingGraph.themes.forEach(t => { themeLabelToId[t.label] = t.id; });

  // Prune stale edges (deleted/downrated books)
  const prunedEdges = existingGraph.edges.filter(e => primaryBookIds.has(e.book_id));

  // Build new edges from mapping
  const newEdges: { book_id: string; theme_id: string }[] = [];
  for (const [indexStr, themeLabels] of Object.entries(mapping)) {
    const book = newBooks[Number(indexStr)];
    if (!book) continue;
    for (const label of themeLabels) {
      const themeId = themeLabelToId[label];
      if (themeId) {
        newEdges.push({ book_id: book.id, theme_id: themeId });
      }
    }
  }

  return {
    themes: existingGraph.themes, // unchanged
    edges: [...prunedEdges, ...newEdges],
  };
}

// ── Dynamic max_tokens based on book count ──────────────────────────

function computeMaxTokens(bookCount: number): number {
  return Math.max(300, Math.min(1024, bookCount * 40));
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

    // Admin client for vault access and profile updates
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate limit: 4 per 24 hours (incremental is cheap: 1 LLM call vs 2)
    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: userId,
      p_function_name: 'reading-themes',
      p_max_requests: 4,
      p_window_minutes: 1440,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded — max 4 theme generations per 24 hours' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch primary-signal books: read + (rating >= 8 OR has a review)
    const { data: booksRaw } = await supabaseUser
      .from('books')
      .select('id, title, author, google_books_description, rating, review_id')
      .eq('user_id', userId)
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

    // Fetch existing profile data
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('reading_themes, reading_themes_at, reading_graph')
      .eq('id', userId)
      .single();

    const existingGraph = profile?.reading_graph as {
      themes: { id: string; label: string; color: string }[];
      edges: { book_id: string; theme_id: string }[];
    } | null;

    const hasExistingGraph = existingGraph?.themes?.length > 0 && existingGraph?.edges?.length > 0;

    // ── Detect unmapped and stale books ──────────────────────────────

    const primaryBookIds = new Set(primaryBooks.map(b => b.id));
    const existingEdgeBookIds = new Set(
      (existingGraph?.edges || []).map((e: { book_id: string }) => e.book_id)
    );
    const newBooks = primaryBooks.filter(b => !existingEdgeBookIds.has(b.id));
    const staleBookIds = [...existingEdgeBookIds].filter(id => !primaryBookIds.has(id));

    // ── Three-path decision ─────────────────────────────────────────

    const isFirstTime = !hasExistingGraph;
    const isBulkImport = newBooks.length > primaryBooks.length * 0.3;
    const needsFullRegen = isFirstTime || isBulkImport;
    const needsIncremental = !needsFullRegen && newBooks.length > 0;
    const hasStaleEdges = staleBookIds.length > 0;

    // No-op: nothing changed
    if (!needsFullRegen && !needsIncremental && !hasStaleEdges) {
      return new Response(
        JSON.stringify({
          success: true,
          themes: profile?.reading_themes || null,
          reading_graph: existingGraph,
          message: 'Themes are current — no new books to process',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stale-only: prune edges, no LLM call
    if (!needsFullRegen && !needsIncremental && hasStaleEdges) {
      const prunedEdges = existingGraph!.edges.filter(e => primaryBookIds.has(e.book_id));
      const prunedGraph = { themes: existingGraph!.themes, edges: prunedEdges };

      await supabaseAdmin
        .from('profiles')
        .update({ reading_graph: prunedGraph })
        .eq('id', userId);

      return new Response(
        JSON.stringify({
          success: true,
          themes: profile?.reading_themes || null,
          reading_graph: prunedGraph,
          message: `Pruned ${staleBookIds.length} stale book(s)`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Fetch Anthropic API key ─────────────────────────────────────

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

    // ── Incremental path: map only new books to existing themes ─────

    let finalThemes: string[] | null = null;
    let readingGraph: { themes: { id: string; label: string; color: string }[]; edges: { book_id: string; theme_id: string }[] } | null = null;

    if (needsIncremental && existingGraph) {
      const existingThemeLabels = existingGraph.themes.map(t => t.label);

      try {
        const prompt = buildIncrementalGraphPrompt(newBooks, existingThemeLabels);
        let raw = await callAnthropic(
          cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, prompt, computeMaxTokens(newBooks.length)
        );
        let parsed = extractJson(raw);

        if (!validateGraphMapping(parsed, newBooks.length, existingThemeLabels)) {
          // Retry once
          raw = await callAnthropic(
            cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, prompt, computeMaxTokens(newBooks.length)
          );
          parsed = extractJson(raw);
        }

        if (validateGraphMapping(parsed, newBooks.length, existingThemeLabels)) {
          readingGraph = mergeIncrementalEdges(
            existingGraph, newBooks, (parsed as GraphMapping).mapping, primaryBookIds
          );
          finalThemes = existingThemeLabels;
          console.log(`Incremental: mapped ${newBooks.length} new book(s), pruned ${staleBookIds.length} stale`);
        } else {
          console.warn('Incremental mapping failed validation, falling back to full regeneration');
          // Fall through to full regen below
        }
      } catch (err) {
        console.warn('Incremental path failed:', (err as Error).message, '— falling back to full regen');
        // Fall through to full regen below
      }
    }

    // ── Full regeneration path (first time, bulk import, or incremental fallback) ──

    if (!readingGraph) {
      const userPrompt = buildUserPrompt(primaryBooks);

      // LLM call 1: extract themes
      let themes: string[] | null = null;
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

      finalThemes = themes;

      if (!finalThemes) {
        return new Response(
          JSON.stringify({
            success: true,
            themes: profile?.reading_themes || null,
            reading_graph: existingGraph,
            note: 'Theme generation produced invalid output; kept previous themes',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // LLM call 2: map ALL books to themes (with dynamic max_tokens)
      try {
        const graphPrompt = buildGraphPrompt(primaryBooks, finalThemes);
        let graphRaw = await callAnthropic(
          cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, graphPrompt, computeMaxTokens(primaryBooks.length)
        );
        let graphParsed = extractJson(graphRaw);

        if (!validateGraphMapping(graphParsed, primaryBooks.length, finalThemes)) {
          // Retry once
          graphRaw = await callAnthropic(
            cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, graphPrompt, computeMaxTokens(primaryBooks.length)
          );
          graphParsed = extractJson(graphRaw);
        }

        if (validateGraphMapping(graphParsed, primaryBooks.length, finalThemes)) {
          readingGraph = buildReadingGraph(
            primaryBooks, finalThemes, (graphParsed as GraphMapping).mapping
          );
          console.log(`Full regen: mapped ${primaryBooks.length} books to ${finalThemes.length} themes`);
        }
      } catch (err) {
        console.warn('Graph generation failed:', (err as Error).message);
      }
    }

    // ── Safety: don't save new themes without a matching graph ────
    // If themes changed but graph mapping failed, the old graph would reference
    // old theme labels — creating a mismatch. Keep everything as-is instead.
    if (finalThemes && !readingGraph && existingGraph) {
      console.warn('Themes generated but graph mapping failed — keeping previous data');
      return new Response(
        JSON.stringify({
          success: true,
          themes: profile?.reading_themes || null,
          reading_graph: existingGraph,
          note: 'Graph mapping failed; kept previous themes and graph',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Save to profiles ────────────────────────────────────────────

    const updatePayload: Record<string, unknown> = {
      reading_themes_at: new Date().toISOString(),
    };
    if (finalThemes) {
      updatePayload.reading_themes = finalThemes;
    }
    if (readingGraph) {
      updatePayload.reading_graph = readingGraph;
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

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
    console.error('reading-themes error:', err);
    const status = message.includes('Anthropic API error') ? 502 : 500;
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
