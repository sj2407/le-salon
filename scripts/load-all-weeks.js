#!/usr/bin/env node
/* global process */

/**
 * Batch-load all unloaded philosophy week entries.
 *
 * Scans courant_philosophiques/weeks/week*.md for files with week numbers,
 * computes the Monday date for each, loads missing ones into the database,
 * and triggers TTS audio generation.
 *
 * Usage:
 *   node scripts/load-all-weeks.js
 *   npm run load-weeks
 *
 * Environment:
 *   VITE_SUPABASE_URL          - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY     - Anon key (for TTS function invocation)
 *   SUPABASE_SERVICE_ROLE_KEY  - Service role key (required for DB writes)
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { parseMarkdown } from './lib/parse-markdown.js'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Week 1 = Monday, February 9, 2026
const BASE_DATE = new Date('2026-02-09T00:00:00Z')

function weekToDate(weekNum) {
  const date = new Date(BASE_DATE)
  date.setUTCDate(date.getUTCDate() + (weekNum - 1) * 7)
  if (date.getUTCDay() !== 1) {
    throw new Error(`Computed date ${date.toISOString().split('T')[0]} for week ${weekNum} is not a Monday`)
  }
  return date.toISOString().split('T')[0]
}

async function generateTTS(weekId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ salon_week_id: weekId })
    })
    const result = await res.json()
    if (result.url) {
      return { ok: true, url: result.url }
    }
    return { ok: false, error: result.error || 'unknown error' }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function main() {
  const weeksDir = join(process.cwd(), 'courant_philosophiques', 'weeks')

  // Scan for week*.md files and extract week numbers
  const files = readdirSync(weeksDir)
    .filter(f => /^week\d+.*\.md$/.test(f))
    .map(f => {
      const match = f.match(/^week(\d+)/)
      return { filename: f, weekNum: parseInt(match[1], 10) }
    })
    .sort((a, b) => a.weekNum - b.weekNum)

  if (files.length === 0) {
    console.log('No week*.md files found in courant_philosophiques/weeks/')
    process.exit(0)
  }

  console.log(`Found ${files.length} week file(s): ${files.map(f => `week${f.weekNum}`).join(', ')}`)

  // Compute dates for each
  const weekEntries = files.map(f => ({
    ...f,
    weekOf: weekToDate(f.weekNum),
    filePath: join(weeksDir, f.filename)
  }))

  // Check which weeks are already loaded
  const { data: existingWeeks, error: fetchError } = await supabase
    .from('salon_weeks')
    .select('week_of')

  if (fetchError) {
    console.error('Error fetching existing weeks:', fetchError.message)
    process.exit(1)
  }

  const existingDates = new Set(existingWeeks.map(w => w.week_of))

  const toLoad = weekEntries.filter(e => !existingDates.has(e.weekOf))
  const skipped = weekEntries.filter(e => existingDates.has(e.weekOf))

  if (skipped.length > 0) {
    console.log(`\nSkipping ${skipped.length} already loaded: ${skipped.map(s => `week${s.weekNum} (${s.weekOf})`).join(', ')}`)
  }

  if (toLoad.length === 0) {
    console.log('\nAll weeks are already loaded. Nothing to do.')
    process.exit(0)
  }

  console.log(`\nLoading ${toLoad.length} new week(s)...\n`)

  let failures = 0

  for (const entry of toLoad) {
    console.log(`--- Week ${entry.weekNum}: ${entry.weekOf} (${entry.filename}) ---`)

    try {
      const content = readFileSync(entry.filePath, 'utf-8')
      const parsed = parseMarkdown(content)

      console.log(`  Title: "${parsed.title}"`)
      console.log(`  Body: ${parsed.body.length} chars`)
      console.log(`  Quote: ${parsed.quote ? 'yes' : 'none'}`)
      console.log(`  Further reading: ${parsed.furtherReading.length} items`)
      console.log(`  Sources: ${parsed.sources.length} items`)

      const { data, error } = await supabase
        .from('salon_weeks')
        .upsert(
          {
            week_of: entry.weekOf,
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

      if (error) throw error

      const weekId = data[0].id
      console.log(`  Inserted (id: ${weekId})`)

      // Generate TTS audio
      console.log('  Generating TTS audio...')
      const tts = await generateTTS(weekId)
      if (tts.ok) {
        console.log(`  Audio ready: ${tts.url}`)
      } else {
        console.warn(`  Audio generation failed: ${tts.error} (non-fatal)`)
      }

      console.log('  Done.\n')
    } catch (err) {
      console.error(`  FAILED: ${err.message}\n`)
      failures++
    }
  }

  // Summary
  console.log('=== Summary ===')
  console.log(`  Loaded: ${toLoad.length - failures}`)
  console.log(`  Skipped: ${skipped.length}`)
  if (failures > 0) {
    console.log(`  Failed: ${failures}`)
    process.exit(1)
  }
}

main()
