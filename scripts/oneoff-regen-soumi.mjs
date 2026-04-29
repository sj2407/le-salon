#!/usr/bin/env node
/**
 * One-off regen for soumi using the new prompts. Mirrors the logic in
 * supabase/functions/reading-themes/index.ts but runs against the live DB
 * with the service role key, so it works without going through Portrait.
 *
 * Usage: node scripts/oneoff-regen-soumi.mjs
 */

import { readFileSync } from 'node:fs'

// Load .env
const envText = readFileSync('.env', 'utf8')
const env = Object.fromEntries(
  envText.split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')]
    })
)

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY
// First positional arg overrides the default user UUID.
const TARGET = process.argv[2] || '2c90c849-f767-443e-a0e3-1d1438eac6f4'
const SOUMI = TARGET

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

async function rpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  if (!r.ok) throw new Error(`rpc ${fn}: ${r.status} ${await r.text()}`)
  return r.json()
}

async function rest(path, init = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!r.ok) throw new Error(`rest ${path}: ${r.status} ${await r.text()}`)
  if (r.status === 204) return null
  return r.json()
}

// Get Anthropic key from vault
const secrets = await rpc('get_secret', { secret_name: 'anthropic_api_key' })
const anthropicKey = secrets?.[0]?.secret
if (!anthropicKey) throw new Error('No anthropic_api_key in vault')

// Fetch soumi's primary-signal books (matches new edge function filter)
const booksRaw = await rest(
  `/books?user_id=eq.${SOUMI}&status=eq.read&select=id,title,author,google_books_description,rating,review_id,date_read,created_at`
)

const primaryBooks = booksRaw
  .filter(b => {
    const r = b.rating != null ? Number(b.rating) : null
    return (r != null && r >= 7) || b.review_id != null
  })
  .map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    google_books_description: b.google_books_description,
    read_at: b.date_read ?? b.created_at,
    created_at: b.created_at,
  }))
  .sort((a, b) => new Date(b.read_at).getTime() - new Date(a.read_at).getTime())

console.log(`Primary-signal books: ${primaryBooks.length}`)

// Build user prompt (same as edge function)
function buildUserPrompt(books) {
  const bookLines = books.map(b => {
    const date = b.read_at ? b.read_at.slice(0, 10) : null
    const desc = b.google_books_description ? ` (${b.google_books_description.slice(0, 200)})` : ''
    const dateLabel = date ? ` (read ${date})` : ''
    return b.author
      ? `"${b.title}" by ${b.author}${dateLabel}${desc}`
      : `"${b.title}"${dateLabel}${desc}`
  })
  return `Given these books (all rated 7-10 or reviewed), sorted newest-first by reading date: ${bookLines.join('; ')}

Identify 6-10 recurring thematic preoccupations. Not genre labels, actual themes.
Good examples: "memory & loss", "post-colonial voices", "slow fiction",
"female interiority", "political violence", "the absurd".

Weight recent reads more heavily: books from roughly the last six months should
have the strongest influence on the theme set; books from a year ago count
about half as much; older books still inform recurring patterns. Newer reads
deserve fresh themes if their preoccupations differ from older ones.

Return only a JSON array of strings, no preamble.`
}

function buildGraphPrompt(books, themes) {
  const bookLines = books.map((b, i) =>
    `${i}: "${b.title}"${b.author ? ` by ${b.author}` : ''}${
      b.google_books_description ? ` (${b.google_books_description.slice(0, 200)})` : ''
    }`
  )
  return `Books:\n${bookLines.join('\n')}

Themes: ${JSON.stringify(themes)}

For each book, return an array of 0-3 themes from the list above, or [] if no theme genuinely fits the book. Do not force-fit outliers. Return an entry for every book, even if its array is empty.

Return JSON: {"mapping": {"0": ["theme1", "theme2"], "1": [], "2": ["theme2"], ...}}
Keys are book indices (as strings), values are arrays of theme strings from the list above.`
}

async function callAnthropic(system, user, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`)
  const j = await r.json()
  return j.content?.[0]?.text?.trim() || ''
}

function extractJson(text) {
  try { return JSON.parse(text) } catch {}
  const arr = text.match(/\[[\s\S]*\]/)
  if (arr) try { return JSON.parse(arr[0]) } catch {}
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj) try { return JSON.parse(obj[0]) } catch {}
  throw new Error('No JSON found in: ' + text.slice(0, 200))
}

const THEME_COLORS = [
  '#C97B63','#7BA78A','#8B7DAE','#CDA74E','#6B9BC3',
  '#A85F8E','#5F8C8C','#B8794D','#6E8C5F','#9B7BC9',
]

console.log('\n>>> Calling Anthropic for themes...')
const themesRaw = await callAnthropic(
  'You extract recurring thematic preoccupations from book lists. Return only a JSON array of strings, no preamble.',
  buildUserPrompt(primaryBooks),
  300,
)
const themes = extractJson(themesRaw)
console.log(`Got ${themes.length} themes`)

console.log('\n>>> Calling Anthropic for graph mapping...')
const maxTokens = Math.max(300, Math.min(2048, primaryBooks.length * 40))
const mappingRaw = await callAnthropic(
  'You map books to thematic preoccupations. Return only valid JSON, no preamble.',
  buildGraphPrompt(primaryBooks, themes),
  maxTokens,
)
const mappingObj = extractJson(mappingRaw)

// Build graph (with empty-theme post-filter)
const themeNodes = themes.map((label, i) => ({
  id: `theme-${i}`,
  label,
  color: THEME_COLORS[i % THEME_COLORS.length],
}))
const labelToId = Object.fromEntries(themeNodes.map(t => [t.label, t.id]))
const edges = []
for (const [idxStr, labels] of Object.entries(mappingObj.mapping || {})) {
  const book = primaryBooks[Number(idxStr)]
  if (!book) continue
  for (const label of labels) {
    const id = labelToId[label]
    if (id) edges.push({ book_id: book.id, theme_id: id })
  }
}
const usedIds = new Set(edges.map(e => e.theme_id))
const filteredThemes = themeNodes.filter(t => usedIds.has(t.id))
const finalThemes = filteredThemes.map(t => t.label)
const readingGraph = { themes: filteredThemes, edges }

// Save back to profile
console.log('\n>>> Saving graph to soumi profile...')
await rest(`/profiles?id=eq.${SOUMI}`, {
  method: 'PATCH',
  body: JSON.stringify({
    reading_themes: finalThemes,
    reading_themes_at: new Date().toISOString(),
    reading_graph: readingGraph,
  }),
})

// === Display results ===
console.log('\n')
console.log('==============================')
console.log('THEMES (sorted by edge count)')
console.log('==============================')
const counts = {}
for (const e of edges) counts[e.theme_id] = (counts[e.theme_id] || 0) + 1
const sorted = [...filteredThemes].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
sorted.forEach((t, i) => {
  console.log(`${i + 1}. ${t.label}  (${counts[t.id] || 0} books)`)
})

console.log('\n==============================')
console.log('5 MOST RECENT PRIMARY-SIGNAL BOOKS')
console.log('==============================')
const recent5 = primaryBooks.slice(0, 5)
for (const b of recent5) {
  const myThemes = edges
    .filter(e => e.book_id === b.id)
    .map(e => filteredThemes.find(t => t.id === e.theme_id)?.label)
    .filter(Boolean)
  const date = b.read_at ? b.read_at.slice(0, 10) : '?'
  const author = b.author ? ` by ${b.author}` : ''
  console.log(`- "${b.title}"${author}  (${date})`)
  console.log(`    themes: ${myThemes.length ? myThemes.join(', ') : '(none)'}`)
}

console.log('\nDone. Reload Portrait in the app to see the new graph.')
