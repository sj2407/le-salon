#!/usr/bin/env node
/* global process */

/**
 * Load a philosophy week entry from a markdown file into the salon_weeks table.
 *
 * Usage:
 *   node scripts/load-week.js <path-to-md-file> <week-of-date>
 *
 * Example:
 *   node scripts/load-week.js courant_philosophiques/weeks/EPICUREANISM_ENTRY_FINAL.md 2026-02-17
 *
 * The markdown file must follow this structure:
 *   # Title
 *   Body paragraphs...
 *   ---
 *   **"Quote text"** or **Defining Quote**
 *   — Attribution
 *   ---
 *   **Further reading:** / **Key Works**
 *   - Items...
 *   ---
 *   **Sources:**
 *   - Items...
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  // Use service role key if available, otherwise anon key
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

function parseMarkdown(content) {
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
    // Match **"quote"** or **Defining Quote**\n\n"quote"
    const quoteParts = quoteSection.split('\n')
    const quoteLines = []
    let attrLine = null

    for (const line of quoteParts) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed.startsWith('—') || trimmed.startsWith('--') || trimmed.startsWith('—')) {
        attrLine = trimmed.replace(/^[—–-]+\s*/, '').trim()
      } else if (trimmed === '**Defining Quote**') {
        continue // skip header
      } else {
        quoteLines.push(trimmed.replace(/^\*\*[""]?|[""]?\*\*$/g, '').replace(/^[""]|[""]$/g, ''))
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

async function loadWeek(filePath, weekOf) {
  const content = readFileSync(filePath, 'utf-8')
  const parsed = parseMarkdown(content)

  console.log(`Loading: "${parsed.title}" for week of ${weekOf}`)
  console.log(`  Body: ${parsed.body.length} chars`)
  console.log(`  Quote: ${parsed.quote ? parsed.quote.substring(0, 60) + '...' : 'none'}`)
  console.log(`  Attribution: ${parsed.quoteAttribution || 'none'}`)
  console.log(`  Further reading: ${parsed.furtherReading.length} items`)
  console.log(`  Sources: ${parsed.sources.length} items`)

  const { data, error } = await supabase
    .from('salon_weeks')
    .upsert(
      {
        week_of: weekOf,
        parlor_title: parsed.title,
        parlor_body: parsed.body,
        parlor_quote: parsed.quote,
        parlor_quote_attribution: parsed.quoteAttribution,
        parlor_further_reading: parsed.furtherReading,
        parlor_sources: parsed.sources,
      },
      { onConflict: 'week_of' }
    )
    .select()

  if (error) {
    console.error('Error inserting:', error.message)
    process.exit(1)
  }

  console.log(`\nInserted/updated successfully (id: ${data[0].id})`)
}

// --- CLI ---
const args = process.argv.slice(2)
if (args.length < 2) {
  console.log('Usage: node scripts/load-week.js <path-to-md-file> <week-of-date>')
  console.log('Example: node scripts/load-week.js courant_philosophiques/weeks/EPICUREANISM_ENTRY_FINAL.md 2026-02-17')
  process.exit(1)
}

loadWeek(args[0], args[1])
