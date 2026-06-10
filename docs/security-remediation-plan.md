# Security Remediation Plan (June 2026)

Status: PROPOSED (revised after independent agent review). Nothing in this plan has been applied. Each item waits on explicit approval.

Source: read-only review of the `main` branch (frontend, 20 edge functions, database functions and RLS via Supabase advisors), with the headline findings adversarially re-verified by reading the code and the live database grants.

### Correction log (from independent review, all re-verified against live ACLs)
1. **`REVOKE FROM anon, authenticated` is a no-op for most of these functions.** They carry a PUBLIC grant (the `=X/postgres` ACL entry), which includes anon. The correct statement is `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated`, then re-grant the roles that legitimately need it. The ONLY exception is `get_secret`, which has no PUBLIC grant, so for it `REVOKE FROM anon, authenticated` is correct and sufficient.
2. **`is_blocked_pair` must keep `authenticated`.** It is called inside the `friendships_respect_blocks` INSERT policy (`WITH CHECK (NOT is_blocked_pair(...))`), which runs with the querying role's privileges. Revoking from `authenticated` breaks all friend requests. Revoke from PUBLIC and anon only.
3. **`send_email_hook` has two overloads.** Revoke the no-arg `send_email_hook()` (public grant). Do NOT touch `send_email_hook(event jsonb)` (locked to `supabase_auth_admin`, the real auth hook).
4. **Fix G (bucket listing) is mechanically wrong as first written** and moves to Tier 4. In Supabase Storage, `list()` and public reads share one SELECT policy on `storage.objects`; there is no separate LIST policy.
5. **Secret rotation must account for the 1-hour vault cache** (`_shared/vaultClient.ts`). Redeploy edge functions after rotating so they re-read the new value.

Guiding rule (TDD order): for every fix, define the closure test (proves the risk is gone) and the regression test (proves the feature still works) BEFORE implementing. All tests run against the throwaway QA account (`androidtest@lesalon.app`), never a real user.

---

## What the "verify first" pass concluded

- **Trigger functions** (`handle_new_user`, `sync_review_to_*`, `cleanup_*`, `notify_*`, `sync_profile_email`): NOT real risks. They return type `trigger`; Postgres refuses a direct RPC call and PostgREST does not expose them. Revoking is cosmetic cleanup, not a fix.
- **`activities` RLS**: sound. SELECT policy is `user_id = auth.uid() OR user_id IN (accepted friends)`. The ToDo client's unfiltered `select('*')` is correctly scoped. No change needed.
- **`activity_interests` RLS**: real but low. SELECT policy `Anyone can view interests USING (true)` exposes the global interest graph. Tightening needs care (ToDo interest counts). Held to Tier 4.
- **Non-trigger SECURITY DEFINER functions, by caller:**
  - `check_rate_limit`: edge-only (service role). Anon can inflate any victim's rate-limit counter. Safe to revoke from anon + authenticated.
  - `has_meaningful_data`: called by the frontend AFTER login (`useOnboardingTrigger.js`, `Onboarding.jsx`). Revoke from `anon` only; keep `authenticated`.
  - `get_showcase_data`: no app caller found; returns only public showcase data. Confirm intent before touching.
  - `reconcile_stuck_shares`, `send_email_hook`, `is_blocked_pair`: cron / auth-hook / internal. Safe to revoke from anon + authenticated.
- **share-intake SSRF**: confirmed low blast radius (returns only parsed og: tags, rehosts `image/*`). Fix must preserve Instagram and TikTok CDN redirects. Held to Tier 4.

Key fact that resolves the original concern: `verify_jwt: false` (the platform gateway setting) is a separate layer from these findings and MUST stay false (share tokens, push secret, cron secret, Capacitor all depend on it). None of the fixes below change `verify_jwt`.

---

## Tier 1: critical, verified zero feature impact

STATUS: DONE (applied to production June 10, 2026; secret rotation skipped per owner, keys judged not exposed). Migrations `20260610000001` (get_secret) and `20260610000002` (newsletter RPCs); `tts` redeployed v19 with `verify_jwt` preserved true. Not yet committed to git.

Severity reassessment for Fix B: `tts` runs with platform `verify_jwt: true`, so the gateway already rejects forged tokens before the function runs. The bypass was therefore NOT a live exploit (the subagent's "Critical" assumed verify_jwt false). Fix B shipped as defense-in-depth and to remove the unsigned-claim pattern. Closure verified: a valid anon-key bearer is denied 401 (no service-role bypass); user-JWT path still returns audio; service-role path matches by construction.

### Fix A. Revoke `get_secret` from anon and authenticated, then rotate secrets
- Risk closed: any anon caller can currently read every vault secret (anthropic, resend, spotify, push, cron keys) via `/rest/v1/rpc/get_secret`.
- Why safe: the frontend never calls it; only edge functions call it through the service role, which bypasses grants.
- Change: `REVOKE EXECUTE ON FUNCTION public.get_secret(text) FROM anon, authenticated;` (verified: this function has NO PUBLIC grant, so this is sufficient).
- Closure test: call `get_secret` with the anon key, expect `permission denied for function get_secret` (no secret is printed).
- Regression test: run a share intake and a photo scan end to end with the QA account; both must still classify and enrich (proves edge functions still read the vault).
- Follow-up (rotation, in order): write the new secret to vault, then redeploy the edge functions so they drop the 1-hour `vaultClient` cache and re-read, confirm they work on the new value, and only THEN invalidate the old key at the provider. Use `docs/key-rotation-checklist.md`.

### Fix B. Fix the `tts` auth bypass
- Risk closed: `tts/index.ts:56-62` trusts an unsigned `payload.role === "service_role"`, so a forged token grants unlimited unauthenticated OpenAI TTS and arbitrary `salon-audio` writes.
- Change: replace the claim read with a constant-time compare of the raw token against `SUPABASE_SERVICE_ROLE_KEY` (or validate via `auth.getUser`).
- Exploit test: forge a token with payload `{"role":"service_role"}` and call `tts`. Pre-fix returns 200; post-fix must return 401. (Note: do not compare against `SUPABASE_ANON_KEY`; the anon key is itself a signed JWT carrying `role`, which is exactly the shape the current code mis-trusts.)
- Regression test 1: `scripts/load-week.js` with `SUPABASE_SERVICE_ROLE_KEY` actually set in the environment still generates audio (the script falls back to `undefined` if the env var is missing, so the test must confirm it is present, else it proves nothing).
- Regression test 2: a logged-in QA user opens the Salon and audio still plays (the normal user-JWT path is untouched).

### Fix C. Revoke the email/sync RPCs from anon and authenticated
- Risk closed: `send_weekly_newsletter()`, `preview_weekly_newsletter(text)`, `monthly_spotify_sync()` are anon-executable, so anyone can trigger mass email or a preview to any address (Resend cost, email bombing).
- Why safe: cron runs them as the postgres role; the frontend never calls them.
- Change: `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated;` on all three (keep service_role). PUBLIC removal is the part that actually closes anon.
- Closure test: call each as anon, expect permission denied.
- Regression test: confirm the `weekly-newsletter` and `monthly-spotify-sync` cron jobs still execute (service-role `SELECT` succeeds).

---

## Tier 2: targeted revokes, each verified by caller

STATUS: DONE (applied to production June 10, 2026, migration `20260610000003`; not yet committed to git). Verified: anon denied on all; `authenticated` retains `has_meaningful_data` (onboarding returns true) and `is_blocked_pair` (friend-request block check returns false); `service_role` retains `check_rate_limit`; `send_email_hook(jsonb)` auth hook untouched. Post-change sweep found no other anon-executable SECURITY DEFINER function except the 9 trigger functions (non-callable, non-risk) and `get_showcase_data` (now also revoked, migration `20260610000004`; owner confirmed the Sarah empty-state showcase is no longer used). The 9 trigger functions are left as-is (non-callable, harmless).

Every statement here is `REVOKE EXECUTE ... FROM PUBLIC, anon, ...` because the PUBLIC grant is what currently exposes these. Re-grant is noted where a role legitimately needs it.

- **Fix D. `check_rate_limit`**: `REVOKE ... FROM PUBLIC, anon, authenticated` (keep service_role; all 15 callers are edge functions on the service role). Closure: anon call denied. Regression: a rate-limited function (dictation) still enforces its limit.
- **Fix E. `has_meaningful_data`**: `REVOKE ... FROM PUBLIC, anon` and ensure `authenticated` keeps EXECUTE (both callers, `useOnboardingTrigger.js:30` and `Onboarding.jsx:58`, run post-login). Regression: onboarding routes correctly for a logged-in QA user.
- **Fix F. `reconcile_stuck_shares`, `send_email_hook()` (no-arg overload only), `is_blocked_pair`**:
  - `reconcile_stuck_shares`, `send_email_hook()`: `REVOKE ... FROM PUBLIC, anon, authenticated` (cron / no app caller).
  - `is_blocked_pair`: `REVOKE ... FROM PUBLIC, anon` but KEEP `authenticated` (required by the `friendships_respect_blocks` RLS policy).
  - Do NOT touch `send_email_hook(event jsonb)` (the real auth hook, locked to `supabase_auth_admin`).
  - Regression: signup email still sends, the share-reconcile cron still runs, and (critical) an authenticated QA user can send AND accept a friend request (proves `is_blocked_pair` still executes under RLS).
- **Fix G — moved to Tier 4** (mechanism corrected; see below).
- **`get_showcase_data`**: also carries a PUBLIC grant. It returns only public showcase data (a hardcoded showcase user, `is_private = false`) and has no app caller. Decide intent before shipping the batch: if it backs an unauthenticated onboarding preview, leave anon; otherwise `REVOKE ... FROM PUBLIC, anon, authenticated`.
- After applying the grant batch, re-run the Supabase security advisor to sweep for any other SECURITY DEFINER function with a PUBLIC grant the by-name list missed.

---

## Tier 3: robustness, behavior-preserving

- **Fix H. Edge fetch timeouts**: add `AbortSignal.timeout(...)` to fetches that lack one, via a shared `callAnthropic()` / `callOpenAI()` helper (also resolves the duplication CLAUDE.md asks to flag). Regression: each scan/enrich still returns normally.
- **Fix I. Batch N+1 writes**: Reviews cover updates and recommend-notifications, ToDo auto-archive, Portrait viewing enrichment. Regression: recommend a review to two friends, assert exactly two notification rows are created.
- **Fix J. Clear module caches on sign-out** (Reviews, LaListe). Regression (Playwright, two QA accounts): sign out of A, sign in as B, assert B's first render never shows A's data.
- **Fix K. Set `search_path`** on the six flagged functions. Closure: advisor warning clears. Regression: signup, email send, push still work.

---

## Tier 4: needs care, separate follow-up

- **Fix G (revised). Stop public-bucket enumeration.** Mechanism correction: `storage.list()` and the SDK download path are governed by the same broad `SELECT USING (true)` policy on `storage.objects`; there is no separate LIST policy. For a public bucket, image loads via the `/object/public/...` URL bypass RLS entirely, so removing the broad SELECT policy should stop SDK enumeration WITHOUT breaking `getPublicUrl` image loads. This needs its own verification because the behavior is subtle. Exploit test: anon `storage.list('')` on `share-images` currently returns a file list. Closure test: after removing the broad SELECT policy, anon `list('')` returns empty or denied. Regression test: load a known cover and a profile photo by public URL (HTTP 200) and confirm an authenticated user can still upload and remove their own files. No frontend code calls `.list()` (verified), so no client feature depends on enumeration.
- **Fix L. Tighten `activity_interests` SELECT** to the user's network. Held separate because it touches ToDo interest counts; gets its own before/after count test.
- **Fix M. Harden share-intake SSRF** (block private resolved IPs and unsafe redirects while allowing social CDNs). Held separate because it can affect the share feature; gets a redirect-following regression test against real Instagram and TikTok URLs.

---

## Process

1. Independent agent review of this plan (poke holes in the test design, catch any fix that secretly breaks a feature).
2. Implement Tier by Tier, running that tier's closure and regression tests before moving on.
3. Tiers 1 and 2 are database grants plus one small `tts` code change, the safest and highest value, done first.

Sequencing is by dependency and risk, not by time.
