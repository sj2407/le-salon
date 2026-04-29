#!/usr/bin/env node
/**
 * Visual parity check for the title-parsing logic shared between
 * sync_review_to_books (existing AFTER INSERT trigger) and
 * cleanup_book_on_review_delete (new BEFORE DELETE trigger,
 * supabase/migrations/20260429000001_review_delete_cleans_book.sql).
 *
 * Both triggers must split a free-form review title like
 *   "Foster by Claire Keegan"
 * into a title + author. The migration copies the regex verbatim from the
 * existing function.
 *
 * This script translates the same regex into JavaScript and runs it
 * against a list of representative titles. It is for visual inspection —
 * the user reviews the printed table and confirms the splits look right
 * before the migration is applied to the live database.
 *
 * Usage: node scripts/test-title-parse-parity.mjs
 */

// JavaScript translation of the SQL regex.
// SQL "E' by [A-Z]'" -> JS / by [A-Z]/
// SQL "E', [A-Z][a-z]+ [A-Z]'" -> JS /, [A-Z][a-z]+ [A-Z]/
function parseTitleAndAuthor(rawTitle) {
  let title = (rawTitle ?? '').trim()
  let author = null

  if (/ by [A-Z]/.test(title)) {
    const m = title.match(/^(.*) by ([A-Z].*)$/)
    if (m) {
      author = m[2].trim()
    }
    title = title.replace(/ by [A-Z][^,]*$/, '').trim()
  } else if (/, [A-Z][a-z]+ [A-Z]/.test(title)) {
    const m = title.match(/^(.*), ([A-Z][a-z]+ [A-Z].*)$/)
    if (m) {
      author = m[2].trim()
    }
    title = title.replace(/, [A-Z][a-z]+ [A-Z][^,]*$/, '').trim()
  }

  return { title, author }
}

// Representative cases. The "expected" values are what the existing
// sync_review_to_books trigger should already produce for these inputs.
const cases = [
  // Plain title, no author
  { input: 'Foster',                                expected: { title: 'Foster', author: null } },
  { input: '1984',                                  expected: { title: '1984', author: null } },

  // "Title by Author" — the most common case
  { input: 'Foster by Claire Keegan',               expected: { title: 'Foster', author: 'Claire Keegan' } },
  { input: 'The Sundial by Shirley Jackson',        expected: { title: 'The Sundial', author: 'Shirley Jackson' } },
  { input: 'Surfeit of lampreys by Ngaio Marsh',    expected: { title: 'Surfeit of lampreys', author: 'Ngaio Marsh' } },

  // Multi-word author
  { input: 'A Place of Greater Safety by Hilary Mantel',
    expected: { title: 'A Place of Greater Safety', author: 'Hilary Mantel' } },

  // "Title, Firstname Lastname" fallback
  { input: 'The Lottery, Shirley Jackson',          expected: { title: 'The Lottery', author: 'Shirley Jackson' } },

  // Lowercase author after "by" should not match (regex requires uppercase)
  { input: 'go tell it to the mountain by james baldwin',
    expected: { title: 'go tell it to the mountain by james baldwin', author: null } },

  // Pre-existing quirk: " by " followed by an uppercase letter triggers the
  // author rule even when the trailing word is not really an author name.
  // sync_review_to_books has the same behaviour. Documenting it here so the
  // parity check stays honest. Out of scope for this migration to fix.
  { input: 'Stand by Me',                           expected: { title: 'Stand', author: 'Me' } },

  // Leading/trailing whitespace
  { input: '  Foster by Claire Keegan  ',          expected: { title: 'Foster', author: 'Claire Keegan' } },

  // Title with a comma but no clear author pattern
  { input: 'Title, with a stray comma',             expected: { title: 'Title, with a stray comma', author: null } },

  // Non-Latin / accented author
  { input: 'Le Chien jaune by Georges Simenon',    expected: { title: 'Le Chien jaune', author: 'Georges Simenon' } },

  // Title with internal "by" before the author
  { input: 'The History of Love by Nicole Krauss', expected: { title: 'The History of Love', author: 'Nicole Krauss' } },
]

function rowsEqual(a, b) {
  return a.title === b.title && (a.author ?? null) === (b.author ?? null)
}

let failures = 0
const out = []

for (const c of cases) {
  const got = parseTitleAndAuthor(c.input)
  const ok = rowsEqual(got, c.expected)
  if (!ok) failures++
  out.push({
    input: c.input,
    parsedTitle: got.title,
    parsedAuthor: got.author ?? '(null)',
    match: ok ? 'OK' : 'MISMATCH',
  })
}

// Print as a table for visual inspection
console.log('Title parsing parity check')
console.log('==========================')
console.table(out)
console.log('')
console.log(`Total cases: ${cases.length}    Failures: ${failures}`)

if (failures > 0) {
  console.error('At least one case did not match the expected parse. Review before applying the migration.')
  process.exit(1)
}

console.log('All cases match expected output.')
