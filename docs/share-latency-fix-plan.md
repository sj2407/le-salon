# Share Sheet Latency Fix — Plan

## Goal

Make the iOS Share Sheet dismiss fast (under ~1s) when sharing a post into Le Salon, **without changing how sharing works or what data is extracted**. The final `pending_shares` row must end up byte-for-byte identical to today.

## Constraints (non-negotiable)

- Latency only. Reduce tap-to-dismissal time.
- The enriched row (`raw_metadata`, `ai_classification`, `ai_extracted_fields`, `routed_to`, `needs_review`, image) must be identical to today.
- Keep the unfurl, the Haiku model + prompt, and image rehosting exactly as they are.
- Same feature behavior: platforms, dedup, rate limit, auth.
- Only *when* work runs may change (sync vs background), not *whether* it runs or its output.

## Backend capability check — DONE

`EdgeRuntime.waitUntil(promise)` is officially supported by Supabase Edge Functions for "respond immediately, finish work in the background." Confirmed via Supabase docs (Background Tasks). Notes:
- A `beforeunload` event fires before the function shuts down — usable to flag a row if killed mid-enrichment.
- Background work is capped by wall-clock/CPU/memory limits. Our ~3.6s is almost all network wait (low CPU), comfortably within limits.
- The local Supabase CLI terminates background tasks after the response unless configured — the golden-output tests must set that flag.
- Not currently used anywhere in `supabase/functions/` — this is a new pattern in the repo.

---

## Root cause (verified)

Tap-to-dismissal today = full server round-trip (~3.6s, measured `execution_time_ms 3632`) + a hardcoded 1.5s native delay. The iOS extension blocks on the *entire* enrichment pipeline before the share sheet closes. None of the enrichment needs to be synchronous: the work runs server-side, and a realtime listener already exists to deliver the result to the UI.

Critical correctness fact (verified against production): the Instagram unfurl **works** (36/36 Instagram rows captured title + image + description, 0 needs_review). The ~3.6s is legitimate, valuable work that must be preserved, not removed. See memory `share-intake-instagram-unfurl-works.md`.

---

## The change

### Edge function: `supabase/functions/share-intake/index.ts`

Split the handler into a fast synchronous ack and a background enrichment task.

**Synchronous phase (before the 200 response):**
1. Parse headers/body, `validateUrl` (SSRF), `detectPlatform` — pure, no I/O. (unchanged, [index.ts:392-449](../supabase/functions/share-intake/index.ts))
2. `resolveUser` — auth gate, must precede everything (yields `userId`). ([:382](../supabase/functions/share-intake/index.ts))
3. Rate-limit count and duplicate check — run in `Promise.all` (currently serial at [:419](../supabase/functions/share-intake/index.ts) and [:433](../supabase/functions/share-intake/index.ts)). Return 429 / "already pending" 200 as today.
4. Insert a **skeleton row**: `user_id`, `source_url`, `source_platform`, `status='pending'`, `enrichment_status='enriching'`, all enrichment fields null. Catch unique-violation (`23505`) and return the same "already pending" 200 (race-safe dedup).
5. Register the background task (step 6) via `EdgeRuntime.waitUntil(...)`, then **return 200 immediately** with `{ success: true, share_id }`.

**Background phase (inside `waitUntil`, after the response):**
6. `getSecret` → `unfurlUrl` → `sanitizeForLlm` → `Promise.all([classifyWithHaiku, rehostImage])` — moved **verbatim** from today ([:452-483](../supabase/functions/share-intake/index.ts)). Then `UPDATE` the skeleton row with the exact same field set today's code computes ([:486-511](../supabase/functions/share-intake/index.ts)), and set `enrichment_status='done'`.
7. Wrap the whole block in try/catch: on any failure, `UPDATE ... SET needs_review=true, enrichment_status='failed'` (mirrors today's error branch). Add a `beforeunload` handler that flags an in-flight row as `failed` if the function is being shut down.

**Add a timeout to the Haiku call** ([:265](../supabase/functions/share-intake/index.ts), currently none): `AbortSignal.timeout(~12000)`. On timeout it takes the existing catch path → `needs_review=true`. No effect on healthy calls; bounds the background isolate lifetime.

### Schema: new additive migration

Add one column to `pending_shares`:
```
enrichment_status TEXT NOT NULL DEFAULT 'done'
  CHECK (enrichment_status = ANY (ARRAY['enriching','done','failed']))
```
Default `'done'` so any other insert path is unaffected. Purely additive — **no change to the existing `status` CHECK or the dedup index** (the skeleton row is still `status='pending'`, so dedup keeps working unchanged).

### iOS: `ios/App/ShareExtension/ShareViewController.swift`

- Remove / shorten the 1.5s delay in `close(withSuccess:)` ([:104](../ios/App/ShareExtension/ShareViewController.swift)). Default: 0.4s flash so the checkmark is readable. **[DECISION PENDING — see Open Decisions]**
- Keep the existing foreground `URLSession` ([:65](../ios/App/ShareExtension/ShareViewController.swift)). No background URLSession needed: the server now acks in ~600ms, and the server (not the phone) owns enrichment, so `completeRequest` killing the extension drops nothing. 401/429 feedback is preserved because auth + rate-limit are still evaluated before the 200.
- Optional: lower `timeoutInterval` from 15s to ~8s ([:60](../ios/App/ShareExtension/ShareViewController.swift)).

### Frontend: realtime fill-in

- `src/App.jsx` ([:166-185](../src/App.jsx)): the listener is INSERT-only today and the banner reads the title from the row. With the skeleton insert, add an `event: 'UPDATE'` handler to the same `global-share-notify` channel so the banner fires with the real title when `enrichment_status` flips to `done` (preserves today's "New share: [title]" UX). 
- `src/components/PendingSharesCatchUp.jsx`: guard so a row with `enrichment_status='enriching'` renders a brief "filling in" state (or is held back) rather than a blank card, and fills in via the UPDATE event. The review action stays disabled until the row is `done`/`failed` so a user can never confirm an un-enriched item.

### Safety net: stuck-row sweeper

A scheduled job (repo already runs cron) finds rows `enrichment_status='enriching' AND created_at < now() - interval '2 minutes'` and flips them to `failed` + `needs_review=true` (or re-enriches). Belt-and-suspenders for the rare isolate-killed-mid-flight case. The try/catch + `beforeunload` handle the common failures; the sweeper catches the rest.

---

## Verification — defined BEFORE implementation (TDD order)

### 1. Golden-output equivalence (the load-bearing proof — data unchanged)

- Capture a golden set from production: for a fixed list of `source_url`s (≥3 Instagram, plus YouTube, TikTok, X, a generic article, an activity), snapshot `raw_metadata`, `ai_classification`, `ai_extracted_fields`, `routed_to`, `needs_review`.
- Using the existing fixture harness (`MOCK_APIS=true`, fixture key `haiku-classify-other`, `_shared/fixtures/`), run the **current** and the **new** function against the same URLs and assert the resulting row is deep-equal on every field. Permitted differences: the new `enrichment_status` column, the row id/timestamp, and the rehosted image's random filename (compare content-type + byte length instead).
- Assert the four extraction functions (`unfurlUrl`, `sanitizeForLlm`, `classifyWithHaiku`, `rehostImage`) are unchanged via `git diff` — they only move call-site, never get rewritten.
- Failure-path parity: force a Haiku error and assert the row matches today's `needs_review=true` branch, plus `enrichment_status='failed'`.

### 2. Use-case matrix (share works regardless of user behavior)

| Use case | Expected | 
|---|---|
| Share, stay in Instagram, keep scrolling | Item saved on ack; enriches server-side; fully present whenever app is next opened |
| Share, immediately open Le Salon | Item present immediately; details fill in within ~3.6s via UPDATE; never blank-actionable |
| Share, then lock phone / kill app | Server finishes enrichment regardless (work is server-side) |
| No connection at share time | App shows error, no false "saved", user retries (same as today) |
| Background enrichment fails / isolate recycled | Row saved, flagged `needs_review`; sweeper reconciles; never lost |
| Same URL shared twice | Dedup returns "already pending"; exactly one row |
| 21 shares in an hour | 21st returns 429; exactly 20 rows |

### 3. Latency

- Server: log timestamps at request-start, response-sent, and enrichment-complete. Assert response-sent excludes unfurl/Haiku/rehost (no `[REAL API CALL]` before the response) and is sub-second; enrichment-complete still ~3.6s (work preserved).
- Device: measure tap-to-dismissal before/after on a real reinstall. Target: from ~5-7s down to ~1s.

---

## Review findings (3 independent reviewers) — corrections required before coding

Architecture confirmed sound by all three (waitUntil split, additive `enrichment_status` default `'done'`, foreground URLSession kept, dedup via `23505`, parallelized read pre-checks, Haiku timeout, removing the 1.5s delay). `waitUntil` budget verified ample (150s/400s wall-clock; 2s CPU excludes I/O). Required corrections, by consensus:

- **Banner regression (all three):** the skeleton INSERT fires the App.jsx notification title-less and the counter double-counts (INSERT then UPDATE). Fix: suppress the banner when `payload.new.enrichment_status === 'enriching'`; fire it only on the UPDATE where it flips to `done`; rework `shareCountRef` so one share = one increment.
- **iOS success-message regression (Codex):** the fast 200 no longer returns `title`, so `ShareViewController` falls back to "Shared to Le Salon: Link". Fix: change the success copy to a title-free message (e.g. "Saved to Le Salon — details filling in"); do not rely on `title` in the ack.
- **Catch-up gating must cover all write paths (all three):** `PendingSharesCatchUp` fetches `status='pending'`, so skeleton rows render with the raw URL as title. Gating only single-confirm is insufficient — `handleConfirmAll` and `handleReclassify` also write. Fix: filter `enrichment_status='enriching'` out of `fetchShares` (or hold separately) and hard-block confirm / confirm-all / reclassify until `done`/`failed`.
- **Realtime delivery (A + Codex vs B):** add `ALTER TABLE pending_shares REPLICA IDENTITY FULL` as cheap insurance, and empirically verify the UPDATE reaches the client (table is already in `supabase_realtime` publication). Confirm `realtime.setAuth(token)` precedes the subscription (it does today).
- **Golden-output test reality (all three):** no test harness exists for share-intake, and `unfurlUrl` + `rehostImage` use raw `fetch` (only Haiku routes through the mockable `apiCall`, and its fixture is hardcoded to one classification). Fix: make the **`git diff` showing the four extraction functions moved verbatim** the primary proof; mock unfurl + image fetches for a deterministic deep-equal; treat real-Haiku classification parity as a separate, human-reviewed one-shot check.
- **`beforeunload` is best-effort only (all three):** it cannot reliably complete an async DB write and can clobber a just-succeeded row. Fix: log-only/advisory; the **sweeper is the correctness guarantee**, scoped `WHERE enrichment_status='enriching'`.
- **Sweeper is net-new versioned infra (B):** only two cron jobs exist and they are not in migrations. Spell out the SQL function + `cron.schedule` + where it is recorded. Worst-case legitimate enrichment ~25s, so a 1-2 min threshold is safe.
- **Schema drift blocks local testing (A):** `share_tokens.expires_at` exists in prod but in no migration; a local `supabase db reset` (needed for the golden-output stack) would make `resolveUser` throw. Add a catch-up migration for `expires_at` (and `last_used_at` if also missing) first.
- **Silent missing-key failure (B):** `getSecret` moving to background turns a today-visible 500 into a silent `needs_review`. Acceptable but document it; a missing key is a deploy-wide outage no user would now see.
- **Smaller:** the `23505` catch should return `existing_id` to match today's response shape (Codex); keep the rate-limit count strictly before the insert, not parallel with it (Codex); make the iOS `timeoutInterval` 15→8s a required change, not optional (B + Codex); re-derive all `index.ts` line citations from the current file before implementing (Codex).

## Sequence (verification-first, per project TDD rule) — now phased

**Phase 1 — safe standalone wins (zero realtime / skeleton-row risk):**
1. Remove the 1.5s native delay; lower iOS `timeoutInterval` 15→8s.
2. Parallelize the two read pre-checks (rate-limit + dedup) in the edge function.
3. Add `AbortSignal.timeout` to the Haiku call (graceful `needs_review` fallback).

These change neither the extracted data nor the share flow, and cut perceived latency immediately. Land and verify on-device first.

**Phase 2 — the async skeleton split (gated on the corrections above):**
4. Catch-up migration for `share_tokens.expires_at`; build the golden-output harness (mock unfurl + image) and lock the `git diff` proof + use-case matrix as pass criteria.
5. Implement: edge function fast-ack vs `waitUntil` enrichment (INSERT→UPDATE); additive `enrichment_status` column + `REPLICA IDENTITY FULL`; banner suppression + UPDATE-on-`done`; catch-up gating across confirm/confirm-all/reclassify; the versioned sweeper.
6. Empirically verify realtime UPDATE delivery on a real client before relying on the fill-in UX.
7. Run the defined tests. Not "solved" until the four functions are diff-verified unchanged, golden-output is byte-identical, the use-case matrix passes, and measured latency dropped.
8. Real-device verification per iOS reinstall discipline: `cap sync ios` → build → uninstall → install → launch → share → observe console. QA throwaway account only.

---

## Open decisions

1. **Checkmark on dismiss:** brief 0.4s success flash (default in this plan) vs instant dismissal.
2. **Row state model:** additive `enrichment_status` column (this plan's choice) vs `status='enriching'` enum change vs no-column null-guard.
3. **Scope:** all of the above, or land the safe standalone wins first (remove 1.5s delay + parallelize pre-checks + Haiku timeout) and treat the full async split as a second step.

## Deploy order (STRICT — enforced by reviewers, not by code)

The pieces are interdependent and MUST ship in this order:

1. **Migrations first** (`20260608000001`, `...002`, `...003`). The edge function's skeleton insert references `enrichment_status`, so deploying it before the column exists makes every share throw. And the client's `payload.old.enrichment_status` guards need `REPLICA IDENTITY FULL` (migration 002); shipping the frontend first would make every UPDATE (including `status→confirmed`) fire the banner.
2. **Edge function** (`share-intake`) after the migrations are confirmed applied (column exists, `relreplident='f'`).
3. **Frontend + iOS build** last.

Verify between steps: column present, `REPLICA IDENTITY FULL` set, realtime has picked up the new relation metadata.

## Post-review fixes applied (3 independent code reviewers)

All three audited the implemented branch. Consensus fixes, now applied:
- `postLoginPath` filters out `enriching` rows (was routing users to an empty catch-up screen).
- The `failed` path now persists gathered `raw_metadata` (no longer a bare row) and its DB write is wrapped so it can't escape `waitUntil` as an unhandled rejection.
- The banner and the catch-up live-refetch fire on the terminal transition (`done` OR `failed`), so a failed share is not silent.
- Swift unused `data` binding renamed to `_`.
- Deliberately NOT changed (per reviewer A's correct reasoning, overriding the other two): the success-path UPDATE stays unguarded so a late-but-successful enrichment overwrites a sweeper-set `failed` ("data wins"); only the failure UPDATE keeps the `enrichment_status='enriching'` guard.

Confirmed sound by all three: field-for-field row parity, the `23505` dedup path, the sweeper SQL + `SECURITY DEFINER` hardening, migration default safety, no banner double-fire, no channel leaks.

## Files touched (for reference, no edits yet)

- `supabase/functions/share-intake/index.ts` — sync/ack vs `waitUntil` enrichment split; parallelize pre-checks; `23505` catch; Haiku timeout; `beforeunload`.
- New migration — additive `enrichment_status` column.
- `ios/App/ShareExtension/ShareViewController.swift` — remove 1.5s delay; optional lower timeout.
- `src/App.jsx` — add UPDATE handler to `global-share-notify`.
- `src/components/PendingSharesCatchUp.jsx` — render in-progress state, disable confirm until enriched.
- Scheduled sweeper for stuck `enriching` rows.
