/**
 * Shared markdown parser for philosophy week entries.
 * Used by load-week.js (single) and load-all-weeks.js (batch).
 *
 * Includes a normalizeMarkdown() preprocessor that handles format variations:
 * - Missing --- separators (inserts them before known section headers)
 * - Blockquote-style quotes (strips > prefix)
 * - Header name differences (Reading List → Further reading, etc.)
 */

/**
 * Normalize markdown content before parsing.
 * Ensures consistent 4-section structure regardless of author formatting.
 */
export function normalizeMarkdown(content) {
  let text = content

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n')

  // --- Insert missing separators before known section headers ---
  // These headers should each start a new section (preceded by ---)
  const sectionHeaders = [
    /^\*\*Defining Quote\*\*/m,
    /^\*\*Reading List\*\*/m,
    /^\*\*Further reading[:\s]*\*\*/m,
    /^\*\*Key Works[:\s]*\*\*/m,
    /^\*\*Sources[:\s]*\*\*/m,
  ]

  for (const headerRegex of sectionHeaders) {
    const match = text.match(headerRegex)
    if (match) {
      const idx = text.indexOf(match[0])
      // Check if there's already a --- before this header (within 5 lines)
      const before = text.substring(Math.max(0, idx - 50), idx)
      if (!before.includes('---')) {
        text = text.substring(0, idx) + '---\n\n' + text.substring(idx)
      }
    }
  }

  // --- Normalize header names ---
  text = text.replace(/^\*\*Reading List\*\*/m, '**Further reading:**')
  text = text.replace(/^\*\*Key Works[:\s]*\*\*/m, '**Further reading:**')
  text = text.replace(/^\*\*Sources\*\*$/m, '**Sources:**')

  return text
}

/**
 * Parse a normalized markdown file into structured week data.
 * Expects content that has been run through normalizeMarkdown() first.
 *
 * Structure: 4 sections split by ---
 *   Section 0: # Title + Body
 *   Section 1: Quote + Attribution
 *   Section 2: Further reading list
 *   Section 3: Sources
 */
export function parseMarkdown(rawContent) {
  const content = normalizeMarkdown(rawContent)
  const sections = content.split(/\n---\n/)

  // Section 0: Title + Body
  const titleAndBody = sections[0].trim()
  const titleMatch = titleAndBody.match(/^#\s+(.+)\n/)
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled'
  const body = titleAndBody.replace(/^#\s+.+\n+/, '').trim()

  // Section 1: Quote
  let quote = null
  let quoteAttribution = null
  if (sections[1]) {
    const quoteSection = sections[1].trim()
    const quoteParts = quoteSection.split('\n')
    const quoteLines = []
    let attrLine = null

    for (const line of quoteParts) {
      // Strip blockquote prefix (> ) for week10/11 format
      const trimmed = line.trim().replace(/^>\s*/, '')
      if (!trimmed) continue
      if (trimmed.startsWith('—') || trimmed.startsWith('--') || trimmed.startsWith('—')) {
        attrLine = trimmed.replace(/^[—–-]+\s*/, '').trim()
      } else if (trimmed === '**Defining Quote**') {
        continue // skip header
      } else {
        quoteLines.push(trimmed.replace(/^\*\*[""\u201C]?|[""\u201D]?\*\*$/g, '').replace(/^[""\u201C]|[""\u201D]$/g, ''))
      }
    }

    quote = quoteLines.join(' ').trim()
    quoteAttribution = attrLine
  }

  // Section 2: Further reading / Key Works
  const furtherReading = []
  if (sections[2]) {
    const lines = sections[2].trim().split('\n')
    for (const line of lines) {
      // Format: - Author, *Title* (description)
      // Also:   - *Title* (description)
      const match = line.match(/^-\s+(?:(.+?),\s+)?\*(.+?)\*(?:\s*\((.+?)\))?/)
      if (match) {
        furtherReading.push({
          author: match[1] || '',
          title: match[2],
          description: match[3] || '',
        })
      }
    }
  }

  // Section 3: Sources
  const sources = []
  if (sections[3]) {
    const lines = sections[3].trim().split('\n')
    for (const line of lines) {
      // [Label](URL) format
      const linkMatch = line.match(/\[(.+?)\]\((.+?)\)/)
      if (linkMatch) {
        sources.push({ label: linkMatch[1], url: linkMatch[2] })
      } else {
        // Plain text source
        const textMatch = line.match(/^-\s+(.+)/)
        if (textMatch) {
          sources.push({ label: textMatch[1] })
        }
      }
    }
  }

  return { title, body, quote, quoteAttribution, furtherReading, sources }
}
