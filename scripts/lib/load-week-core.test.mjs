/**
 * Unit tests for diffWeek (load-week-core.js).
 * Run with:  node --test scripts/lib/
 *
 * Uses Node's built-in test runner (no extra deps).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diffWeek, audioPlan } from './load-week-core.js'

// Baseline payload used across tests
const BASE_PAYLOAD = {
  week_of: '2026-02-09',
  parlor_title: 'Stoicism',
  parlor_body: 'The body text.',
  parlor_quote: 'The obstacle is the way.',
  parlor_quote_attribution: 'Marcus Aurelius',
  parlor_further_reading: [{ author: 'Marcus Aurelius', title: 'Meditations' }],
  parlor_sources: [{ label: 'SEP: Stoicism', url: 'https://plato.stanford.edu/entries/stoicism/' }],
  period_start_year: -301,
  period_end_year: 200,
}

test('diffWeek: null existing row => insert + audioNeedsRefresh true', () => {
  const result = diffWeek(null, BASE_PAYLOAD)
  assert.equal(result.action, 'insert')
  assert.equal(result.audioNeedsRefresh, true)
})

test('diffWeek: identical existing row => skip + audioNeedsRefresh false', () => {
  // Simulate a row returned from DB (has extra fields like id, created_at)
  const existingRow = {
    id: 'abc-123',
    created_at: '2026-02-09T12:00:00Z',
    week_of: '2026-02-09',
    parlor_title: 'Stoicism',
    parlor_body: 'The body text.',
    parlor_quote: 'The obstacle is the way.',
    parlor_quote_attribution: 'Marcus Aurelius',
    parlor_further_reading: [{ author: 'Marcus Aurelius', title: 'Meditations' }],
    parlor_sources: [{ label: 'SEP: Stoicism', url: 'https://plato.stanford.edu/entries/stoicism/' }],
    period_start_year: -301,
    period_end_year: 200,
  }
  const result = diffWeek(existingRow, BASE_PAYLOAD)
  assert.equal(result.action, 'skip')
  assert.equal(result.audioNeedsRefresh, false)
})

test('diffWeek: parlor_body changed => update + audioNeedsRefresh true', () => {
  const existingRow = {
    ...BASE_PAYLOAD,
    id: 'abc-123',
    parlor_body: 'OLD body text that differs.',
  }
  const result = diffWeek(existingRow, BASE_PAYLOAD)
  assert.equal(result.action, 'update')
  assert.equal(result.audioNeedsRefresh, true)
})

test('diffWeek: only period_start_year changed => update + audioNeedsRefresh false', () => {
  const existingRow = {
    ...BASE_PAYLOAD,
    id: 'abc-123',
    period_start_year: -999, // different from BASE_PAYLOAD's -301
  }
  const result = diffWeek(existingRow, BASE_PAYLOAD)
  assert.equal(result.action, 'update')
  assert.equal(result.audioNeedsRefresh, false)
})

test('diffWeek: JSONB arrays with same content but different object references => skip', () => {
  // Simulate DB returning a new array object with the same deep content
  const existingRow = {
    ...BASE_PAYLOAD,
    id: 'abc-123',
    // Create new array/object instances (simulating DB deserialization)
    parlor_further_reading: [{ author: 'Marcus Aurelius', title: 'Meditations' }],
    parlor_sources: [{ label: 'SEP: Stoicism', url: 'https://plato.stanford.edu/entries/stoicism/' }],
  }
  const result = diffWeek(existingRow, BASE_PAYLOAD)
  assert.equal(result.action, 'skip')
  assert.equal(result.audioNeedsRefresh, false)
})

test('diffWeek: JSONB key order differs (Postgres jsonb reordering) => skip', () => {
  // Postgres stores jsonb with reordered keys; the DB row comes back {title, author}
  // while buildPayload produces {author, title}. Same content, must be treated equal.
  const existingRow = {
    ...BASE_PAYLOAD,
    id: 'abc-123',
    parlor_further_reading: [{ title: 'Meditations', author: 'Marcus Aurelius' }],
    parlor_sources: [{ url: 'https://plato.stanford.edu/entries/stoicism/', label: 'SEP: Stoicism' }],
  }
  const result = diffWeek(existingRow, BASE_PAYLOAD)
  assert.equal(result.action, 'skip')
})

test('diffWeek: file without year frontmatter does not override DB-only years => skip', () => {
  // Legacy week: DB has years, but the markdown file has no frontmatter, so
  // buildPayload omits the year keys entirely. That must NOT count as a change.
  const payloadNoYears = { ...BASE_PAYLOAD }
  delete payloadNoYears.period_start_year
  delete payloadNoYears.period_end_year

  const existingRow = {
    ...BASE_PAYLOAD,
    id: 'abc-123',
    period_start_year: -301,
    period_end_year: 200,
  }
  const result = diffWeek(existingRow, payloadNoYears)
  assert.equal(result.action, 'skip')
})

// --- audioPlan ---
test('audioPlan: insert => regenerate', () => {
  assert.equal(audioPlan('insert', true, false), 'regenerate')
})

test('audioPlan: update with narration change => regenerate', () => {
  assert.equal(audioPlan('update', true, true), 'regenerate')
})

test('audioPlan: update without narration change, audio present => none', () => {
  assert.equal(audioPlan('update', false, true), 'none')
})

test('audioPlan: skip but audio missing => generate (self-heal)', () => {
  assert.equal(audioPlan('skip', false, false), 'generate')
})

test('audioPlan: skip with audio present => none', () => {
  assert.equal(audioPlan('skip', false, true), 'none')
})

test('audioPlan: update without narration change but audio missing => generate', () => {
  assert.equal(audioPlan('update', false, false), 'generate')
})
