/**
 * Shared markdown parser for philosophy week entries.
 * Used by load-week.js (single) and load-all-weeks.js (batch).
 *
 * Tolerant by design — authors' formatting drifts, so the parser handles:
 * - Section dividers written as ---, ***, or ___ (any 3+ of the same char, spaced or not)
 * - Optional YAML-ish frontmatter carrying period_start_year / period_end_year
 * - Section headers bold (**Further reading:**) or plain (Further reading:)
 * - Header-name aliases (Reading List / Key Works -> Further reading)
 * - Quote attribution led by em-dash, en-dash, or --
 * - Further-reading / sources items with or without a leading - bullet
 * - A missing "# " title heading (falls back to the first non-empty line)
 *
 * See parse-markdown.test.mjs for the behavioral contract.
 */

const FURTHER_READING_NAMES = ['further reading', 'reading list', 'key works']

function isHeaderLine(line, names) {
  const stripped = line.replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/:\s*$/, '').trim().toLowerCase()
  return names.includes(stripped)
}

/**
 * Pull an optional frontmatter block (--- ... ---) off the very top of the file.
 * Only treated as frontmatter when it actually carries a period_* key, so a
 * leading thematic --- divider is never mistaken for frontmatter.
 * Returns { body, periodStartYear, periodEndYear }.
 */
export function extractFrontmatter(rawContent) {
  const text = rawContent.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/)
  let periodStartYear = null
  let periodEndYear = null

  if (fm && /period_(start|end)_year\s*:/.test(fm[1])) {
    const sm = fm[1].match(/period_start_year\s*:\s*(-?\d+)/)
    const em = fm[1].match(/period_end_year\s*:\s*(-?\d+)/)
    if (sm) periodStartYear = Number(sm[1])
    if (em) periodEndYear = Number(em[1])
    return { body: text.slice(fm[0].length), periodStartYear, periodEndYear }
  }

  return { body: text, periodStartYear, periodEndYear }
}

/**
 * Normalize markdown body (frontmatter already removed) before section splitting.
 * Canonicalizes dividers to --- and inserts a divider before a known section
 * header if one is missing.
 */
export function normalizeMarkdown(content) {
  let text = content.replace(/\r\n/g, '\n')

  // Canonicalize any standalone divider line (3+ of -, *, or _, spaced or not) to ---.
  // Line-anchored so inline ***bold*** is never touched.
  text = text.replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, '---')

  // Insert a missing divider before a known section header (bold or plain).
  const sectionHeaders = [
    /^(?:\*\*)?Defining Quote(?:\*\*)?\s*$/m,
    /^(?:\*\*)?Reading List(?:\*\*)?\s*:?\s*$/m,
    /^(?:\*\*)?Further reading(?:\*\*)?\s*:?\s*(?:\*\*)?$/m,
    /^(?:\*\*)?Key Works(?:\*\*)?\s*:?\s*$/m,
    /^(?:\*\*)?Sources(?:\*\*)?\s*:?\s*(?:\*\*)?$/m,
  ]
  for (const headerRegex of sectionHeaders) {
    const match = text.match(headerRegex)
    if (match) {
      const idx = text.indexOf(match[0])
      const before = text.substring(Math.max(0, idx - 50), idx)
      if (!before.includes('---')) {
        text = text.substring(0, idx) + '---\n\n' + text.substring(idx)
      }
    }
  }

  // Normalize header aliases to a canonical bold form.
  text = text.replace(/^(?:\*\*)?Reading List(?:\*\*)?\s*:?\s*$/m, '**Further reading:**')
  text = text.replace(/^(?:\*\*)?Key Works(?:\*\*)?\s*:?\s*$/m, '**Further reading:**')

  return text
}

function stripQuoteMarks(s) {
  return s
    .replace(/^\*\*/, '').replace(/\*\*$/, '')
    .replace(/^["“”]/, '').replace(/["“”]$/, '')
    .trim()
}

/**
 * Parse a week markdown file into structured data.
 *
 * Structure (after frontmatter removal + normalization), 4 sections split by ---:
 *   Section 0: # Title (or bare first line) + Body
 *   Section 1: Quote + Attribution
 *   Section 2: Further reading list
 *   Section 3: Sources
 */
export function parseMarkdown(rawContent) {
  const { body: afterFrontmatter, periodStartYear, periodEndYear } = extractFrontmatter(rawContent)
  const content = normalizeMarkdown(afterFrontmatter)
  const sections = content.split(/\n---\n/)

  // --- Section 0: Title + Body ---
  const lines0 = sections[0].split('\n')
  let i = 0
  while (i < lines0.length && !lines0[i].trim()) i++
  const firstLine = (lines0[i] || '').trim()
  const headingMatch = firstLine.match(/^#\s+(.+)$/)
  const title = headingMatch ? headingMatch[1].trim() : (firstLine || 'Untitled')
  const body = lines0.slice(i + 1).join('\n').trim()

  // --- Section 1: Quote + attribution ---
  let quote = null
  let quoteAttribution = null
  if (sections[1]) {
    const quoteLines = []
    let attrLine = null
    for (const raw of sections[1].trim().split('\n')) {
      const trimmed = raw.trim().replace(/^>\s*/, '')
      if (!trimmed) continue
      if (/^(—|–|--+)\s+/.test(trimmed)) {
        attrLine = trimmed.replace(/^(—|–|--+)\s*/, '').trim()
      } else if (/^(?:\*\*)?Defining Quote(?:\*\*)?$/i.test(trimmed)) {
        continue
      } else {
        quoteLines.push(stripQuoteMarks(trimmed))
      }
    }
    quote = quoteLines.join(' ').trim() || null
    quoteAttribution = attrLine
  }

  // --- Section 2: Further reading / Key Works ---
  const furtherReading = []
  if (sections[2]) {
    for (const raw of sections[2].trim().split('\n')) {
      const line = raw.trim()
      if (!line || isHeaderLine(line, FURTHER_READING_NAMES)) continue
      // - Author, *Title* (description)  /  *Title* (description)  /  bullet optional
      const match = line.match(/^(?:[-*]\s+)?(?:(.+?),\s+)?\*(.+?)\*(?:\s*\((.+?)\))?/)
      if (match) {
        furtherReading.push({
          author: match[1] || '',
          title: match[2],
          description: match[3] || '',
        })
      }
    }
  }

  // --- Section 3: Sources ---
  const sources = []
  if (sections[3]) {
    for (const raw of sections[3].trim().split('\n')) {
      const line = raw.trim()
      if (!line || isHeaderLine(line, ['sources'])) continue
      const linkMatch = line.match(/\[(.+?)\]\((.+?)\)/)
      if (linkMatch) {
        sources.push({ label: linkMatch[1], url: linkMatch[2] })
        continue
      }
      const bulletMatch = line.match(/^[-*]\s+(.+)/)
      sources.push({ label: bulletMatch ? bulletMatch[1] : line })
    }
  }

  return { title, body, quote, quoteAttribution, furtherReading, sources, periodStartYear, periodEndYear }
}
