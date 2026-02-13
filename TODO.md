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
- [ ] Audit all API keys — ensure none are exposed in client-side code or git history
- [ ] Review `.env` / `.env.example` — no real secrets committed
- [ ] Review `.mcp.json` — Supabase access token is currently hardcoded, move to env var or gitignore
- [ ] RLS (Row Level Security) audit — verify all tables have proper policies
- [ ] Check for SQL injection vectors (any raw queries with user input?)
- [ ] Check for XSS vectors (any dangerouslySetInnerHTML or unescaped user content?)
- [ ] Verify CORS / redirect URL configuration in Supabase
- [ ] Review auth token handling (storage, expiry, refresh)
- [ ] Run `npm audit` for dependency vulnerabilities
- [ ] Check Supabase security advisors for recommendations
- [ ] Ensure no sensitive data in console.log statements in production
- [ ] Review edge cases: deleted users, expired tokens, concurrent sessions

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

*Updated: Feb 12, 2026*
