/**
 * Shared core for loading a parsed philosophy week into salon_weeks.
 *
 * Both loaders (load-week.js single, load-all-weeks.js batch) build their
 * upsert payload and fire TTS through here, so they cannot drift apart —
 * notably, BOTH set period_start_year / period_end_year (previously only the
 * single loader did, which left automation-loaded weeks off the timeline).
 */

/**
 * Assemble the salon_weeks upsert payload.
 * Period years come from the markdown frontmatter (parsed.periodStartYear/EndYear),
 * with optional explicit overrides (e.g. load-week.js CLI flags).
 */
export function buildPayload(parsed, weekOf, { periodStart = null, periodEnd = null } = {}) {
  const startYear = periodStart != null ? periodStart : parsed.periodStartYear
  const endYear = periodEnd != null ? periodEnd : parsed.periodEndYear

  const payload = {
    week_of: weekOf,
    parlor_title: parsed.title,
    parlor_body: parsed.body,
    parlor_quote: parsed.quote,
    parlor_quote_attribution: parsed.quoteAttribution,
    parlor_further_reading: parsed.furtherReading,
    parlor_sources: parsed.sources,
  }

  if (startYear != null) payload.period_start_year = startYear
  if (endYear != null) payload.period_end_year = endYear

  return payload
}

/** Upsert a payload by week_of and return the row id. Throws on error. */
export async function upsertWeek(supabase, payload) {
  const { data, error } = await supabase
    .from('salon_weeks')
    .upsert(payload, { onConflict: 'week_of' })
    .select()

  if (error) throw error
  return data[0].id
}

/**
 * Invoke the TTS edge function for a week. Never throws; returns {ok,url|error}.
 * When force is true, the function regenerates and overwrites any existing audio
 * (used when the narration text changed). Otherwise it reuses an existing file.
 */
export async function generateTTS(supabaseUrl, authKey, weekId, force = false) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authKey}`,
      },
      body: JSON.stringify({ salon_week_id: weekId, force }),
    })
    const result = await res.json()
    if (result.url) return { ok: true, url: result.url }
    return { ok: false, error: result.error || 'unknown error' }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

/**
 * Decide what to do about a week's audio. Pure/testable.
 *
 * @param {'insert'|'update'|'skip'} action
 * @param {boolean} audioNeedsRefresh - narration text (parlor_body) changed
 * @param {boolean} audioPresent      - whether week-<id>.mp3 already exists
 * @returns {'regenerate'|'generate'|'none'}
 *   regenerate - force a fresh file (new content or changed narration)
 *   generate   - file is missing, create it (self-heal)
 *   none       - file present and narration unchanged
 */
export function audioPlan(action, audioNeedsRefresh, audioPresent) {
  if (action === 'insert') return 'regenerate'
  if (action === 'update' && audioNeedsRefresh) return 'regenerate'
  if (!audioPresent) return 'generate'
  return 'none'
}

/**
 * The set of fields compared to decide whether a week needs updating.
 * JSONB fields (arrays) are compared by deep value via JSON serialization.
 */
const COMPARED_FIELDS = [
  'parlor_title',
  'parlor_body',
  'parlor_quote',
  'parlor_quote_attribution',
  'parlor_further_reading',
  'parlor_sources',
  'period_start_year',
  'period_end_year',
]

/** JSONB fields that need deep-equality comparison (not ===). */
const JSONB_FIELDS = new Set(['parlor_further_reading', 'parlor_sources'])

/** Year fields only exist when a file carries frontmatter; only compare them when the file asserts them. */
const FRONTMATTER_FIELDS = new Set(['period_start_year', 'period_end_year'])

/** Recursively sort object keys so comparison ignores key order (Postgres jsonb reorders keys). */
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonicalize(value[k])]))
  }
  return value
}

/**
 * Pure decision function: compare an existing DB row against a new payload.
 *
 * @param {object|null} existingRow  - Row from salon_weeks, or null if not in DB
 * @param {object}      payload      - New payload from buildPayload
 * @returns {{ action: 'insert'|'update'|'skip', audioNeedsRefresh: boolean }}
 */
export function diffWeek(existingRow, payload) {
  if (existingRow === null || existingRow === undefined) {
    return { action: 'insert', audioNeedsRefresh: true }
  }

  let changed = false
  for (const field of COMPARED_FIELDS) {
    // Year fields live in frontmatter; if the file doesn't assert them, don't
    // treat DB-only years as a change (legacy weeks keep their stored years).
    if (FRONTMATTER_FIELDS.has(field) && !(field in payload)) continue

    const existing = existingRow[field]
    const next = payload[field]
    if (JSONB_FIELDS.has(field)) {
      // Postgres jsonb reorders object keys, so compare order-insensitively.
      if (JSON.stringify(canonicalize(existing)) !== JSON.stringify(canonicalize(next))) {
        changed = true
        break
      }
    } else {
      // Handle undefined/null symmetrically: treat both as "not set"
      const existingVal = existing ?? null
      const nextVal = next ?? null
      if (existingVal !== nextVal) {
        changed = true
        break
      }
    }
  }

  if (!changed) {
    return { action: 'skip', audioNeedsRefresh: false }
  }

  const audioNeedsRefresh = (existingRow.parlor_body ?? null) !== (payload.parlor_body ?? null)
  return { action: 'update', audioNeedsRefresh }
}
