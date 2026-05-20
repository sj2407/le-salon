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
import { buildPayload, upsertWeek, generateTTS } from './lib/load-week-core.js'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  // Use service role key if available, otherwise anon key
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

async function loadWeek(filePath, weekOf, periodStart, periodEnd) {
  const content = readFileSync(filePath, 'utf-8')
  const parsed = parseMarkdown(content)

  const payload = buildPayload(parsed, weekOf, { periodStart, periodEnd })

  console.log(`Loading: "${parsed.title}" for week of ${weekOf}`)
  console.log(`  Body: ${parsed.body.length} chars`)
  console.log(`  Quote: ${parsed.quote ? parsed.quote.substring(0, 60) + '...' : 'none'}`)
  console.log(`  Attribution: ${parsed.quoteAttribution || 'none'}`)
  console.log(`  Further reading: ${parsed.furtherReading.length} items`)
  console.log(`  Sources: ${parsed.sources.length} items`)
  console.log(`  Period: ${payload.period_start_year ?? '—'} to ${payload.period_end_year ?? '—'}`)

  let weekId
  try {
    weekId = await upsertWeek(supabase, payload)
  } catch (error) {
    console.error('Error inserting:', error.message)
    process.exit(1)
  }
  console.log(`\nInserted/updated successfully (id: ${weekId})`)

  // Pre-generate TTS audio
  console.log('\nGenerating TTS audio...')
  const tts = await generateTTS(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, weekId, true)
  if (tts.ok) {
    console.log(`  Audio ready: ${tts.url}`)
  } else {
    console.error('  Audio generation failed:', tts.error)
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
