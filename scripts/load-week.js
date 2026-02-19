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
import { parseMarkdown } from './lib/parse-markdown.js'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  // Use service role key if available, otherwise anon key
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

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

  const weekId = data[0].id
  console.log(`\nInserted/updated successfully (id: ${weekId})`)

  // Pre-generate TTS audio
  console.log('\nGenerating TTS audio...')
  try {
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ salon_week_id: weekId })
      }
    )
    const result = await res.json()
    if (result.url) {
      console.log(`  Audio ready: ${result.url}`)
    } else {
      console.error('  Audio generation failed:', result.error || 'unknown error')
    }
  } catch (err) {
    console.error('  Audio generation failed:', err.message)
  }
}

// --- CLI ---
const args = process.argv.slice(2)
if (args.length < 2) {
  console.log('Usage: node scripts/load-week.js <path-to-md-file> <week-of-date>')
  console.log('Example: node scripts/load-week.js courant_philosophiques/weeks/EPICUREANISM_ENTRY_FINAL.md 2026-02-17')
  process.exit(1)
}

loadWeek(args[0], args[1])
