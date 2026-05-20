#!/usr/bin/env node
/* global process */

/**
 * Idempotent sync of all philosophy week markdown files into salon_weeks.
 *
 * For each week file, decides one of:
 *   insert - week not in DB -> upsert + generate audio
 *   update - week in DB but content changed -> upsert + refresh audio if parlor_body changed
 *   skip   - week in DB and content identical -> do nothing
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
import { buildPayload, upsertWeek, generateTTS, diffWeek, audioPlan } from './lib/load-week-core.js'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

/** Whether a week's audio file already exists in storage. */
async function audioExists(weekId) {
  const { data } = await supabase.storage
    .from('salon-audio')
    .list('', { search: `week-${weekId}.mp3`, limit: 100 })
  return Array.isArray(data) && data.some((o) => o.name === `week-${weekId}.mp3`)
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

  // Fetch existing rows with all compared fields (single query)
  const { data: existingWeeks, error: fetchError } = await supabase
    .from('salon_weeks')
    .select([
      'id',
      'week_of',
      'parlor_title',
      'parlor_body',
      'parlor_quote',
      'parlor_quote_attribution',
      'parlor_further_reading',
      'parlor_sources',
      'period_start_year',
      'period_end_year',
    ].join(','))

  if (fetchError) {
    console.error('Error fetching existing weeks:', fetchError.message)
    process.exit(1)
  }

  // Build a lookup map: week_of -> existing row
  const existingByDate = new Map(existingWeeks.map(w => [w.week_of, w]))

  console.log(`\nSyncing ${weekEntries.length} week(s)...\n`)

  let inserted = 0
  let updated = 0
  let skipped = 0
  let failures = 0
  let audioFailures = 0

  for (const entry of weekEntries) {
    console.log(`--- Week ${entry.weekNum}: ${entry.weekOf} (${entry.filename}) ---`)

    try {
      const content = readFileSync(entry.filePath, 'utf-8')
      const parsed = parseMarkdown(content)
      const payload = buildPayload(parsed, entry.weekOf)

      const existingRow = existingByDate.get(entry.weekOf) ?? null
      const { action, audioNeedsRefresh } = diffWeek(existingRow, payload)

      let weekId
      if (action === 'skip') {
        skipped++
        weekId = existingRow.id
      } else {
        console.log(`  Decision: ${action}`)
        console.log(`  Title: "${parsed.title}"`)
        console.log(`  Body: ${parsed.body.length} chars`)
        console.log(`  Quote: ${parsed.quote ? 'yes' : 'none'}`)
        console.log(`  Further reading: ${parsed.furtherReading.length} items`)
        console.log(`  Sources: ${parsed.sources.length} items`)
        console.log(`  Period: ${payload.period_start_year ?? '—'} to ${payload.period_end_year ?? '—'}`)
        weekId = await upsertWeek(supabase, payload)
        console.log(`  ${action === 'insert' ? 'Inserted' : 'Updated'} (id: ${weekId})`)
        if (action === 'insert') inserted++
        else updated++
      }

      // Audio: self-healing. Force a fresh file when content/narration changed;
      // generate when the file is simply missing (even for an otherwise-unchanged week).
      const present = await audioExists(weekId)
      const plan = audioPlan(action, audioNeedsRefresh, present)
      if (plan !== 'none') {
        const force = plan === 'regenerate'
        console.log(force ? '  (Re)generating audio...' : '  Audio missing — generating...')
        const tts = await generateTTS(SUPABASE_URL, SERVICE_ROLE_KEY, weekId, force)
        if (tts.ok) {
          console.log(`  Audio ready: ${tts.url}`)
        } else {
          console.error(`  ::error:: Audio generation failed for ${entry.weekOf}: ${tts.error}`)
          audioFailures++
        }
      }

      if (action !== 'skip') console.log('  Done.\n')
    } catch (err) {
      console.error(`  FAILED: ${err.message}\n`)
      failures++
    }
  }

  // Summary
  console.log('=== Summary ===')
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Updated:  ${updated}`)
  console.log(`  Skipped:  ${skipped}`)
  if (audioFailures > 0) console.log(`  Audio failures: ${audioFailures}`)
  if (failures > 0) console.log(`  Failed:   ${failures}`)
  if (failures > 0 || audioFailures > 0) process.exit(1)
}

main()
