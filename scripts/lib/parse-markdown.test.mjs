/**
 * Unit tests for the philosophy-week markdown parser.
 * Run with:  node --test scripts/lib/
 *
 * Uses Node's built-in test runner (no extra deps). Lives outside tests/
 * so the Playwright runner (testDir: ./tests) ignores it.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMarkdown, normalizeMarkdown } from './parse-markdown.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEEKS_DIR = join(__dirname, '..', '..', 'courant_philosophiques', 'weeks')

// --- Group 1: Foucault shape (*** dividers, plain headers, no bullets, en-dash attribution) ---
const FOUCAULT = `# Foucault: Knowledge and Power
First body paragraph.

***

"Knowledge is not made for understanding; it is made for cutting."
– Michel Foucault, *Nietzsche, Genealogy, History* (1971)

***

Further reading:

Michel Foucault, *Discipline and Punish* (1975; the panopticon)
Michel Foucault, *The History of Sexuality, Volume 1* (1976; productive power)

***

Sources:

Stanford Encyclopedia of Philosophy: Michel Foucault
Wikipedia: Michel Foucault
`

test('Foucault shape: *** dividers + plain headers + non-bulleted + en-dash', () => {
  const r = parseMarkdown(FOUCAULT)
  assert.equal(r.title, 'Foucault: Knowledge and Power')
  assert.equal(r.quote, 'Knowledge is not made for understanding; it is made for cutting.')
  assert.equal(r.quoteAttribution, 'Michel Foucault, *Nietzsche, Genealogy, History* (1971)')
  assert.equal(r.furtherReading.length, 2)
  assert.equal(r.furtherReading[0].author, 'Michel Foucault')
  assert.equal(r.furtherReading[0].title, 'Discipline and Punish')
  assert.equal(r.sources.length, 2)
  assert.equal(r.sources[0].label, 'Stanford Encyclopedia of Philosophy: Michel Foucault')
  assert.ok(r.body.includes('First body paragraph'))
  assert.ok(!r.body.includes('Knowledge is not made'), 'quote must not leak into body')
})

// --- Group 2: Derrida shape (no leading #, *** dividers) ---
const DERRIDA = `Derrida and Deconstruction
First body paragraph about différance.

***

"Différance is neither a word nor a concept."
– Jacques Derrida, *Margins of Philosophy* (1972)

***

Further reading:

Jacques Derrida, *Of Grammatology* (1967)

***

Sources:

Stanford Encyclopedia of Philosophy: Jacques Derrida
`

test('Derrida shape: no # title + *** dividers', () => {
  const r = parseMarkdown(DERRIDA)
  assert.equal(r.title, 'Derrida and Deconstruction')
  assert.equal(r.quote, 'Différance is neither a word nor a concept.')
  assert.equal(r.quoteAttribution, 'Jacques Derrida, *Margins of Philosophy* (1972)')
  assert.equal(r.furtherReading.length, 1)
  assert.equal(r.sources.length, 1)
  assert.ok(r.body.includes('First body paragraph'))
  assert.ok(!r.body.startsWith('Derrida and Deconstruction'), 'title line must be stripped from body')
})

// --- Group 3: Feminist shape (--- dividers, em-dash, bold headers, bullets) = REGRESSION anchor ---
const FEMINIST = `# Feminist Philosophy — De Beauvoir to Butler
Body about the Other.

---

**"One is not born, but rather becomes, a woman."**
— Simone de Beauvoir, *The Second Sex* (1949)

---

**Further reading:**
- Simone de Beauvoir, *The Second Sex* (1949; Borde translation)
- bell hooks, *Ain't I a Woman* (1981)

---

**Sources:**
- [SEP: Simone de Beauvoir](https://plato.stanford.edu/entries/beauvoir/)
- bell hooks, *Ain't I a Woman*, South End Press, 1981
`

test('Feminist shape: --- dividers + bold headers + bullets (regression)', () => {
  const r = parseMarkdown(FEMINIST)
  assert.equal(r.title, 'Feminist Philosophy — De Beauvoir to Butler')
  assert.equal(r.quote, 'One is not born, but rather becomes, a woman.')
  assert.equal(r.quoteAttribution, 'Simone de Beauvoir, *The Second Sex* (1949)')
  assert.equal(r.furtherReading.length, 2)
  assert.equal(r.sources.length, 2)
  assert.equal(r.sources[0].label, 'SEP: Simone de Beauvoir')
  assert.equal(r.sources[0].url, 'https://plato.stanford.edu/entries/beauvoir/')
})

// --- Group 4: Frontmatter year extraction ---
test('frontmatter: period years parsed, not leaked into body', () => {
  const withFm = `---
period_start_year: 1961
period_end_year: 1984
---
# Foucault: Knowledge and Power
Body text.

---

"Q."
— A. B. (2000)
`
  const r = parseMarkdown(withFm)
  assert.equal(r.periodStartYear, 1961)
  assert.equal(r.periodEndYear, 1984)
  assert.equal(r.title, 'Foucault: Knowledge and Power')
  assert.ok(!r.body.includes('period_start_year'))
})

test('frontmatter: absent => null years, no crash', () => {
  const r = parseMarkdown(FOUCAULT)
  assert.equal(r.periodStartYear ?? null, null)
  assert.equal(r.periodEndYear ?? null, null)
})

test('frontmatter: negative BCE year parses to negative number', () => {
  const bce = `---
period_start_year: -384
period_end_year: -322
---
# Aristotle
Body.
`
  const r = parseMarkdown(bce)
  assert.equal(r.periodStartYear, -384)
  assert.equal(r.periodEndYear, -322)
})

// --- Group 5: divider/dash micro-guards ---
test('normalizeMarkdown collapses *** and *_* style dividers to ---', () => {
  assert.match(normalizeMarkdown('a\n***\nb'), /\n---\n/)
  assert.match(normalizeMarkdown('a\n* * *\nb'), /\n---\n/)
  // inline bold-italic must NOT be touched
  assert.ok(!/---/.test(normalizeMarkdown('this is ***bold*** text')))
})

// --- Group 6: real-file smoke test (catches future drift) ---
test('real week files all parse to non-empty structured output', () => {
  const files = readdirSync(WEEKS_DIR).filter(f => /^week22-|^week23-|^week24-/.test(f))
  assert.ok(files.length === 3, `expected 3 target files, found ${files.length}`)
  for (const f of files) {
    const r = parseMarkdown(readFileSync(join(WEEKS_DIR, f), 'utf-8'))
    assert.notEqual(r.title, 'Untitled', `${f}: title should not be Untitled`)
    assert.ok(r.quote && r.quote.length > 0, `${f}: quote should be non-empty`)
    assert.ok(r.furtherReading.length > 0, `${f}: furtherReading should be non-empty`)
    assert.ok(r.sources.length > 0, `${f}: sources should be non-empty`)
  }
})
