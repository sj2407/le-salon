# Le Salon — App Store Launch Checklist

**Goal**: Submit to Apple App Store by ~Feb 19, 2026

---

## 1. Authentication: Social Login
- [ ] Set up Google OAuth (Google Cloud Console project, client ID/secret, Supabase config)
- [ ] Set up Apple Sign In (Apple Developer account, Service ID, Supabase config)
- [ ] Add "Sign in with Google" / "Sign in with Apple" buttons to SignIn page
- [ ] Add social login options to SignUp page
- [ ] Handle edge case: same email used for both social + email/password
- [ ] Test full flow for each provider (sign up, sign in, sign out, re-sign in)

## 2. Security Sweep

Full audit completed Feb 14, 2026. Items marked with findings that need action.

### 2A. Secrets & Credentials

- [x] `.env` is gitignored and was never committed to git history
- [x] `.mcp.json` reverted to `${SUPABASE_ACCESS_TOKEN}` env var (no longer hardcoded)
- [x] `.env.example` documents all required env vars without real values
- [x] `VITE_SUPABASE_ANON_KEY` is public by design (Supabase anon key, embedded in browser bundle) — no action needed
- [x] `RESEND_API_KEY` is only in `.env` (gitignored) and Supabase Vault — not exposed
- [x] No hardcoded secrets found in any source file
- [x] `npm audit` — 0 vulnerabilities (255 dependencies)

### 2B. RLS Policies — FIXED

- [x] `notifications` INSERT policy tightened: `WITH CHECK (auth.uid() = actor_id)` — users can only create notifications as themselves
- [x] `newsletters` INSERT policy tightened: `WITH CHECK (auth.uid() = user_id)` — users can only create their own newsletters
- [x] `newsletter_items` INSERT policy tightened: requires newsletter ownership via EXISTS check
- [x] 4 functions fixed with `SET search_path = public`: `sync_profile_email`, `handle_new_user`, `send_weekly_newsletter`, `preview_weekly_newsletter`

### 2C. Auth Configuration

- [ ] **FIX: Leaked password protection is DISABLED** — Supabase can check passwords against HaveIBeenPwned.org. Enable in Supabase Dashboard → Auth → Settings. See: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- [x] Auth tokens managed entirely by Supabase SDK (no manual JWT handling)
- [x] No auth tokens stored in localStorage — Supabase handles session storage
- [x] `localStorage` only used for non-sensitive UI data (text size, cached week content)
- [ ] Review Supabase redirect URL allowlist — ensure only your production domain and localhost are listed
- [ ] Review session expiry / refresh token settings in Supabase Auth config

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

- [x] Content-Security-Policy added in `vercel.json` — restricts script/style/img/media/connect sources to self + known domains (Supabase, Deezer, Google Fonts)
- [x] X-Frame-Options: DENY — prevents clickjacking
- [x] X-Content-Type-Options: nosniff
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Permissions-Policy: camera=(), geolocation=(), microphone=(self)
- [x] No source maps in production build (verified — none generated)

### 2H. Edge Cases

- [ ] Test: What happens when a user deletes their account? Are their notifications, reviews, activities properly cascaded?
- [ ] Test: Expired/revoked session — does the app redirect to sign-in gracefully?
- [ ] Test: Concurrent sessions (same account, two browsers) — any state conflicts?
- [ ] Test: What happens if a friend is unfriended — are their recommendations, notes, wishlist claims cleaned up?

## 3. UI/UX Polish
- [ ] Investigate card flip animation (research via Mobbin for inspiration)
- [ ] Add meaningful micro-animations (page transitions, list items, buttons)
- [ ] Review mobile responsiveness across screen sizes
- [ ] Test touch interactions (swipe, long press, pull to refresh if applicable)
- [ ] Ensure all loading states have proper feedback (skeletons, spinners)
- [ ] Ensure all error states have clear user-friendly messages
- [ ] Review typography and spacing consistency
- [ ] Dark mode consideration (nice-to-have for App Store)

## 4. App Store Prep (after above)
- [ ] PWA / native wrapper setup (Capacitor? PWA?)
- [ ] App icons and splash screens at required resolutions
- [ ] App Store screenshots and description
- [ ] Privacy policy URL (required by Apple)
- [ ] Terms of service URL
- [ ] App Store review guidelines compliance check
- [ ] Test on physical iOS device

---

*Updated: Feb 14, 2026*
