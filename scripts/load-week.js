#!/usr/bin/env node
/* global process */

/**
 * Load a philosophy week entry from a markdown file into the salon_weeks table.
 *
 * Usage:
 *   node scripts/load-week.js <path-to-md-file> <week-of-date> [--period-start YEAR] [--period-end YEAR]
 *
 * Example:
 *   node scripts/load-week.js courant_philosophiques/weeks/EPICUREANISM_ENTRY_FINAL.md 2026-02-17 --period-start -307 --period-end 300
 *
 * Period years: negative for BCE (e.g. -445 for 445 BCE), positive for CE.
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

async function loadWeek(filePath, weekOf, periodStart, periodEnd) {
  const content = readFileSync(filePath, 'utf-8')
  const parsed = parseMarkdown(content)

  console.log(`Loading: "${parsed.title}" for week of ${weekOf}`)
  console.log(`  Body: ${parsed.body.length} chars`)
  console.log(`  Quote: ${parsed.quote ? parsed.quote.substring(0, 60) + '...' : 'none'}`)
  console.log(`  Attribution: ${parsed.quoteAttribution || 'none'}`)
  console.log(`  Further reading: ${parsed.furtherReading.length} items`)
  console.log(`  Sources: ${parsed.sources.length} items`)
  if (periodStart != null) console.log(`  Period: ${periodStart} to ${periodEnd}`)

  const payload = {
    week_of: weekOf,
    parlor_title: parsed.title,
    parlor_body: parsed.body,
    parlor_quote: parsed.quote,
    parlor_quote_attribution: parsed.quoteAttribution,
    parlor_further_reading: parsed.furtherReading,
    parlor_sources: parsed.sources,
  }

  if (periodStart != null) payload.period_start_year = periodStart
  if (periodEnd != null) payload.period_end_year = periodEnd

  const { data, error } = await supabase
    .from('salon_weeks')
    .upsert(payload, { onConflict: 'week_of' })
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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const res = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`
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
  console.log('Usage: node scripts/load-week.js <path-to-md-file> <week-of-date> [--period-start YEAR] [--period-end YEAR]')
  console.log('Example: node scripts/load-week.js courant_philosophiques/weeks/EPICUREANISM_ENTRY_FINAL.md 2026-02-17 --period-start -307 --period-end 300')
  process.exit(1)
}

// Parse optional --period-start and --period-end flags
let periodStart = null
let periodEnd = null
const psIdx = args.indexOf('--period-start')
if (psIdx !== -1 && args[psIdx + 1]) periodStart = Number(args[psIdx + 1])
const peIdx = args.indexOf('--period-end')
if (peIdx !== -1 && args[peIdx + 1]) periodEnd = Number(args[peIdx + 1])

loadWeek(args[0], args[1], periodStart, periodEnd)
