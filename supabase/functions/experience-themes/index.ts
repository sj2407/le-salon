import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

let cachedAnthropicKey: string | null = null;

const SYSTEM_PROMPT =
  'You extract recurring thematic preoccupations from lists of live performances and exhibitions. Return only a JSON array of strings, no preamble.';

interface ExperienceForThemes {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  artist_name: string | null;
  wikipedia_description: string | null;
  date_at: string | null;  // best date proxy: experiences.date or created_at
  created_at: string;
}

const THEME_COLORS = [
  '#C97B63', '#7BA78A', '#8B7DAE', '#CDA74E', '#6B9BC3',
  '#A85F8E', '#5F8C8C', '#B8794D', '#6E8C5F', '#9B7BC9',
];

function describeRow(e: ExperienceForThemes): string {
  const desc = e.wikipedia_description ? ` (${e.wikipedia_description.slice(0, 200)})` : '';
  const sub = e.subcategory ? ` [${e.subcategory}]` : '';
  const artist = e.artist_name ? ` — ${e.artist_name}` : '';
  return `"${e.name}"${sub}${artist}${desc}`;
}

function buildUserPrompt(rows: ExperienceForThemes[]): string {
  const lines = rows.map(r => {
    const date = r.date_at ? r.date_at.slice(0, 10) : null;
    const dateLabel = date ? ` (attended ${date})` : '';
    return `${describeRow(r)}${dateLabel}`;
  });
  return `Given these live performances and exhibitions, sorted newest-first by date attended: ${lines.join('; ')}

Identify 4-10 recurring thematic preoccupations. Not genre labels — actual themes.
Good examples: "political voices", "physical theatre", "minimalist composition",
"modernist staging", "operatic tradition", "queer storytelling", "myth & ritual".

Weight recent experiences more heavily: events from roughly the last six months
should have the strongest influence; events from a year ago count about half;
older events still inform recurring patterns.

Return only a JSON array of strings, no preamble.`;
}

function validateThemes(parsed: unknown): parsed is string[] {
  if (!Array.isArray(parsed)) return false;
  if (parsed.length < 4 || parsed.length > 12) return false;
  return parsed.every(
    (item: unknown) => typeof item === 'string' && item.length > 0 && item.length <= 50
  );
}

function extractJson(text: string): unknown {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch { /* fall through */ } }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch { /* fall through */ } }
  throw new Error('No JSON found in response');
}

const GRAPH_SYSTEM_PROMPT =
  'You map live performances and exhibitions to thematic preoccupations. Return only valid JSON, no preamble.';

function buildGraphPrompt(rows: ExperienceForThemes[], themes: string[]): string {
  const lines = rows.map((r, i) => `${i}: ${describeRow(r)}`);
  return `Experiences:\n${lines.join('\n')}

Themes: ${JSON.stringify(themes)}

For each experience, return an array of 0-3 themes from the list above, or [] if no theme genuinely fits. Do not force-fit outliers. Return an entry for every experience, even if its array is empty.

Return JSON: {"mapping": {"0": ["theme1", "theme2"], "1": [], "2": ["theme2"], ...}}
Keys are experience indices (as strings), values are arrays of theme strings from the list above.`;
}

function buildIncrementalGraphPrompt(newRows: ExperienceForThemes[], existingThemes: string[]): string {
  const lines = newRows.map((r, i) => `${i}: ${describeRow(r)}`);
  return `Existing themes: ${JSON.stringify(existingThemes)}

New experiences to map:
${lines.join('\n')}

For each new experience, return an array of 0-3 themes from the existing themes list, or [] if no theme genuinely fits. Do not force-fit outliers. Return an entry for every experience, even if its array is empty.

Return JSON: {"mapping": {"0": ["theme1", "theme2"], "1": [], ...}}
Keys are experience indices (as strings), values are arrays of theme strings from the existing themes list.`;
}

interface GraphMapping { mapping: Record<string, string[]>; }

function validateGraphMapping(parsed: unknown, count: number, themes: string[]): parsed is GraphMapping {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  if (!obj.mapping || typeof obj.mapping !== 'object') return false;
  const mapping = obj.mapping as Record<string, unknown>;
  if (Object.keys(mapping).length < Math.min(2, count)) return false;
  const themeSet = new Set(themes);
  for (const [key, val] of Object.entries(mapping)) {
    if (isNaN(Number(key)) || Number(key) >= count) return false;
    if (!Array.isArray(val)) return false;
    for (const t of val) {
      if (typeof t !== 'string' || !themeSet.has(t)) return false;
    }
  }
  return true;
}

function buildExperienceGraph(
  rows: ExperienceForThemes[],
  themes: string[],
  mapping: Record<string, string[]>
): { themes: { id: string; label: string; color: string }[]; edges: { experience_id: string; theme_id: string }[] } {
  const themeNodes = themes.map((label, i) => ({
    id: `theme-${i}`,
    label,
    color: THEME_COLORS[i % THEME_COLORS.length],
  }));
  const themeLabelToId: Record<string, string> = {};
  themeNodes.forEach(t => { themeLabelToId[t.label] = t.id; });

  const edges: { experience_id: string; theme_id: string }[] = [];
  for (const [indexStr, themeLabels] of Object.entries(mapping)) {
    const row = rows[Number(indexStr)];
    if (!row) continue;
    for (const label of themeLabels) {
      const themeId = themeLabelToId[label];
      if (themeId) edges.push({ experience_id: row.id, theme_id: themeId });
    }
  }

  const usedThemeIds = new Set(edges.map(e => e.theme_id));
  const filteredThemes = themeNodes.filter(t => usedThemeIds.has(t.id));
  return { themes: filteredThemes, edges };
}

function mergeIncrementalEdges(
  existingGraph: { themes: { id: string; label: string; color: string }[]; edges: { experience_id: string; theme_id: string }[] },
  newRows: ExperienceForThemes[],
  mapping: Record<string, string[]>,
  primaryIds: Set<string>
): { themes: { id: string; label: string; color: string }[]; edges: { experience_id: string; theme_id: string }[] } {
  const themeLabelToId: Record<string, string> = {};
  existingGraph.themes.forEach(t => { themeLabelToId[t.label] = t.id; });

  const prunedEdges = existingGraph.edges.filter(e => primaryIds.has(e.experience_id));
  const newEdges: { experience_id: string; theme_id: string }[] = [];
  for (const [indexStr, themeLabels] of Object.entries(mapping)) {
    const row = newRows[Number(indexStr)];
    if (!row) continue;
    for (const label of themeLabels) {
      const themeId = themeLabelToId[label];
      if (themeId) newEdges.push({ experience_id: row.id, theme_id: themeId });
    }
  }
  const mergedEdges = [...prunedEdges, ...newEdges];
  const usedThemeIds = new Set(mergedEdges.map(e => e.theme_id));
  return {
    themes: existingGraph.themes.filter(t => usedThemeIds.has(t.id)),
    edges: mergedEdges,
  };
}

function computeMaxTokens(count: number): number {
  return Math.max(300, Math.min(1024, count * 40));
}

async function callAnthropic(apiKey: string, systemPrompt: string, userPrompt: string, maxTokens = 100): Promise<string> {
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
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: userId,
      p_function_name: 'experience-themes',
      p_max_requests: 4,
      p_window_minutes: 1440,
    });

    if (allowed === false) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded — max 4 theme generations per 24 hours' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Primary signal: rating >= 7 OR review_id IS NOT NULL, AND has a Wikipedia description
    const { data: rowsRaw } = await supabaseUser
      .from('experiences')
      .select('id, name, category, subcategory, artist_name, wikipedia_description, rating, review_id, date, created_at')
      .eq('user_id', userId);

    // Primary signal: any experience with a Wikipedia description.
    // Unlike books, experiences are intentionally logged (manual / scan / review),
    // so a description is sufficient signal. Rating / review are optional.
    const primary: ExperienceForThemes[] = (rowsRaw || [])
      .filter((r: Record<string, unknown>) => {
        const desc = r.wikipedia_description as string | null;
        return desc && desc.length > 0;
      })
      .map((r: Record<string, unknown>) => {
        const dt = r.date as string | null;
        const ct = r.created_at as string;
        return {
          id: r.id as string,
          name: r.name as string,
          category: r.category as string,
          subcategory: r.subcategory as string | null,
          artist_name: r.artist_name as string | null,
          wikipedia_description: r.wikipedia_description as string | null,
          date_at: dt ?? ct,
          created_at: ct,
        };
      })
      .sort((a, b) => {
        const ta = a.date_at ? new Date(a.date_at).getTime() : 0;
        const tb = b.date_at ? new Date(b.date_at).getTime() : 0;
        return tb - ta;
      });

    if (primary.length < 4) {
      return new Response(JSON.stringify({
        success: true,
        themes: null,
        message: 'Not enough enriched experiences (need 4)',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('experience_themes, experience_themes_at, experience_graph')
      .eq('id', userId)
      .single();

    const existingGraph = profile?.experience_graph as {
      themes: { id: string; label: string; color: string }[];
      edges: { experience_id: string; theme_id: string }[];
    } | null;

    const hasExistingGraph = existingGraph?.themes?.length > 0 && existingGraph?.edges?.length > 0;

    const primaryIds = new Set(primary.map(r => r.id));
    const existingEdgeIds = new Set((existingGraph?.edges || []).map((e: { experience_id: string }) => e.experience_id));
    const newRows = primary.filter(r => !existingEdgeIds.has(r.id));
    const staleIds = [...existingEdgeIds].filter(id => !primaryIds.has(id));

    const isFirstTime = !hasExistingGraph;
    const isBulkImport = newRows.length >= 5;
    const needsFullRegen = isFirstTime || isBulkImport;
    const needsIncremental = !needsFullRegen && newRows.length > 0;
    const hasStaleEdges = staleIds.length > 0;

    if (!needsFullRegen && !needsIncremental && !hasStaleEdges) {
      return new Response(JSON.stringify({
        success: true,
        themes: profile?.experience_themes || null,
        experience_graph: existingGraph,
        message: 'Themes are current — no new experiences to process',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!needsFullRegen && !needsIncremental && hasStaleEdges) {
      const prunedEdges = existingGraph!.edges.filter(e => primaryIds.has(e.experience_id));
      const prunedGraph = { themes: existingGraph!.themes, edges: prunedEdges };
      await supabaseAdmin.from('profiles').update({ experience_graph: prunedGraph }).eq('id', userId);
      return new Response(JSON.stringify({
        success: true,
        themes: profile?.experience_themes || null,
        experience_graph: prunedGraph,
        message: `Pruned ${staleIds.length} stale experience(s)`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!cachedAnthropicKey) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', { secret_name: 'anthropic_api_key' });
      cachedAnthropicKey = secrets?.[0]?.secret || null;
    }
    if (!cachedAnthropicKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let finalThemes: string[] | null = null;
    let experienceGraph: { themes: { id: string; label: string; color: string }[]; edges: { experience_id: string; theme_id: string }[] } | null = null;

    // Incremental path
    if (needsIncremental && existingGraph) {
      const existingThemeLabels = existingGraph.themes.map(t => t.label);
      try {
        const prompt = buildIncrementalGraphPrompt(newRows, existingThemeLabels);
        let raw = await callAnthropic(cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, prompt, computeMaxTokens(newRows.length));
        let parsed = extractJson(raw);
        if (!validateGraphMapping(parsed, newRows.length, existingThemeLabels)) {
          raw = await callAnthropic(cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, prompt, computeMaxTokens(newRows.length));
          parsed = extractJson(raw);
        }
        if (validateGraphMapping(parsed, newRows.length, existingThemeLabels)) {
          experienceGraph = mergeIncrementalEdges(existingGraph, newRows, (parsed as GraphMapping).mapping, primaryIds);
          finalThemes = existingThemeLabels;
        }
      } catch (err) {
        console.warn('Incremental path failed:', (err as Error).message);
      }
    }

    // Full regeneration path
    if (!experienceGraph) {
      const userPrompt = buildUserPrompt(primary);
      let themes: string[] | null = null;
      let rawResponse = await callAnthropic(cachedAnthropicKey, SYSTEM_PROMPT, userPrompt);
      try {
        const parsed = extractJson(rawResponse);
        if (validateThemes(parsed)) themes = parsed;
      } catch { /* retry below */ }

      if (!themes) {
        try {
          rawResponse = await callAnthropic(cachedAnthropicKey, SYSTEM_PROMPT, userPrompt);
          const parsed = extractJson(rawResponse);
          if (validateThemes(parsed)) themes = parsed;
        } catch { /* keep previous */ }
      }

      finalThemes = themes;
      if (!finalThemes) {
        return new Response(JSON.stringify({
          success: true,
          themes: profile?.experience_themes || null,
          experience_graph: existingGraph,
          note: 'Theme generation produced invalid output; kept previous themes',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      try {
        const graphPrompt = buildGraphPrompt(primary, finalThemes);
        let graphRaw = await callAnthropic(cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, graphPrompt, computeMaxTokens(primary.length));
        let graphParsed = extractJson(graphRaw);
        if (!validateGraphMapping(graphParsed, primary.length, finalThemes)) {
          graphRaw = await callAnthropic(cachedAnthropicKey, GRAPH_SYSTEM_PROMPT, graphPrompt, computeMaxTokens(primary.length));
          graphParsed = extractJson(graphRaw);
        }
        if (validateGraphMapping(graphParsed, primary.length, finalThemes)) {
          experienceGraph = buildExperienceGraph(primary, finalThemes, (graphParsed as GraphMapping).mapping);
        }
      } catch (err) {
        console.warn('Graph generation failed:', (err as Error).message);
      }
    }

    if (finalThemes && !experienceGraph && existingGraph) {
      return new Response(JSON.stringify({
        success: true,
        themes: profile?.experience_themes || null,
        experience_graph: existingGraph,
        note: 'Graph mapping failed; kept previous themes and graph',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (experienceGraph) {
      finalThemes = experienceGraph.themes.map(t => t.label);
    }

    const updatePayload: Record<string, unknown> = { experience_themes_at: new Date().toISOString() };
    if (finalThemes) updatePayload.experience_themes = finalThemes;
    if (experienceGraph) updatePayload.experience_graph = experienceGraph;

    await supabaseAdmin.from('profiles').update(updatePayload).eq('id', userId);

    return new Response(JSON.stringify({
      success: true,
      themes: finalThemes,
      experience_graph: experienceGraph,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    console.error('experience-themes error:', err);
    const status = message.includes('Anthropic API error') ? 502 : 500;
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
