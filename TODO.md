# Le Salon — Launch Checklist

---

## 1. Authentication: Social Login
- [ ] Set up Google OAuth (Google Cloud Console project, client ID/secret, Supabase config)
- [ ] Set up Apple Sign In (Apple Developer account, Service ID, Supabase config)
- [ ] Add "Sign in with Google" / "Sign in with Apple" buttons to SignIn page
- [ ] Add social login options to SignUp page
- [ ] Handle edge case: same email used for both social + email/password
- [ ] Test full flow for each provider (sign up, sign in, sign out, re-sign in)

## 2. Security Sweep

Full audit completed Feb 14, 2026. Re-audited Feb 24, 2026.

### 2A. Secrets & Credentials

- [x] `.env` is gitignored and was never committed to git history
- [x] `.env.example` documents all required env vars without real values
- [x] `VITE_SUPABASE_ANON_KEY` is public by design (Supabase anon key, embedded in browser bundle) — no action needed
- [x] `RESEND_API_KEY` is only in `.env` (gitignored) and Supabase Vault — not exposed
- [x] No hardcoded secrets found in any source file
- [x] `npm audit` — 0 vulnerabilities (255 dependencies)
- [x] `.mcp.json` has hardcoded access token — **accepted risk** (file is gitignored, repo is private). Token was briefly in git history but repo access is restricted.

### 2B. RLS Policies — FIXED

- [x] `notifications` INSERT policy tightened: `WITH CHECK (auth.uid() = actor_id)`
- [x] `newsletters` INSERT policy tightened: `WITH CHECK (auth.uid() = user_id)`
- [x] `newsletter_items` INSERT policy tightened: requires newsletter ownership via EXISTS check
- [x] 4 functions fixed with `SET search_path = public`: `sync_profile_email`, `handle_new_user`, `send_weekly_newsletter`, `preview_weekly_newsletter`

### 2C. Auth Configuration

- [x] Leaked password protection enabled (HaveIBeenPwned check) — enabled Feb 24, 2026
- [x] Auth tokens managed entirely by Supabase SDK (no manual JWT handling)
- [x] No auth tokens stored in localStorage — Supabase handles session storage
- [x] `localStorage` only used for non-sensitive UI data (text size, cached week content)
- [ ] Review Supabase redirect URL allowlist (Dashboard > Auth > URL Configuration). Should be:
  - **Site URL:** `https://le-salon.vercel.app`
  - **Redirect URLs:** `http://localhost:5173/**` and `https://le-salon.vercel.app/**`
  - App uses `window.location.origin` + `/account` (email change) and `/reset-password` (password reset)
- [ ] Review session expiry / refresh token settings (Dashboard > Auth > Settings). Defaults: 1h access token, 1 week refresh token.

### 2D. XSS & Injection

- [x] No `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, or `eval()` in codebase
- [x] Markdown rendering uses React elements only (no raw HTML injection) — `markdownUtils.jsx`
- [x] All database queries use Supabase parameterized query builder — no SQL injection vectors
- [x] User input rendered as text content via React (auto-escaped)
- [x] JSONP calls (Deezer API) use `encodeURIComponent` and random callback names

### 2E. Input Validation — FIXED

- [x] File size limit (5MB) and MIME type validation on profile photo upload in `Profile.jsx`
- [x] Max character length on text inputs: review title (200), review text (5000), salon responses (2000), commonplace entries (5000), activity description (300), activity date (100), activity location (200), activity price (50)
- [x] Rating range validation (0-10) client-side in `Reviews.jsx` before submission

### 2F. Console Logging — FIXED

- [x] Removed all console.log/error statements from production code (only 1 intentionally kept: startup env var check in `supabase.js`)
- [x] Catch blocks use `// silently handled` comments or user-facing error state instead

### 2G. HTTP Security Headers — FIXED

- [x] Content-Security-Policy added in `vercel.json`
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Permissions-Policy: camera=(), geolocation=(), microphone=(self)
- [x] No source maps in production build

### 2H. Edge Functions — FIXED Feb 24, 2026

- [x] TMDB API key moved from URL query param to Authorization Bearer header (`cover-search/index.ts`)
- [x] All 3 edge functions verify JWT (defense-in-depth + `verify_jwt` deployment flag)
- [x] Secrets stored in Supabase Vault, not hardcoded
- [x] CORS is `*` — **accepted**: JWT-based auth means wildcard CORS doesn't enable CSRF (attacker can't read victim's token cross-origin)
- [x] `cover-search` edge function deployed (v3) with TMDB Bearer header fix — Feb 24, 2026

### 2I. Edge Cases

- [ ] Test: Account deletion cascades (notifications, reviews, activities)
- [ ] Test: Expired/revoked session — does the app redirect to sign-in gracefully?
- [ ] Test: Concurrent sessions (same account, two browsers) — any state conflicts?
- [ ] Test: Unfriending cleanup — recommendations, notes, wishlist claims

## 3. Code Quality Fixes — Feb 24, 2026

- [x] Salon.jsx: race condition on fast week swipe — stale fetch no longer overwrites current week data (`currentWeekIdRef` guard)
- [x] FriendCard.jsx: null guard on `friendProfile` in `handleUpdateReviewComment` and `handleDeleteReviewComment`
- [x] useSpeechRecognition.js: language toggle bug — `start()` now reads `lang` via ref instead of stale closure; also stops existing instance before creating new one
- [x] DictationModal.jsx: language toggle delay 100ms → 200ms to match ref update timing

## 4. UI/UX Polish

- [x] Card flip animation (3D marginalia flip)
- [x] Micro-animations: page transitions, toast notifications, list cascade fade-in, haptic feedback
- [x] Touch interactions: swipe tab navigation, scroll-snap carousel, haptics
- [ ] Review mobile responsiveness across screen sizes (ongoing)
- [ ] Ensure all loading states have proper feedback (skeletons vs. "Loading...")
- [ ] Ensure all error states have clear user-friendly messages (some async ops fail silently)
- [ ] Dark mode consideration (nice-to-have)

## 5. App Store Prep (after above)
- [ ] PWA / native wrapper setup (Capacitor? PWA?)
- [ ] App icons and splash screens at required resolutions
- [ ] App Store screenshots and description
- [ ] Privacy policy URL (required by Apple)
- [ ] Terms of service URL
- [ ] App Store review guidelines compliance check
- [ ] Test on physical iOS device

---

*Updated: Feb 24, 2026*
