-- Security fix (Tier 2): lock down SECURITY DEFINER helper functions that were
-- exposed to PUBLIC (the `=X/postgres` ACL entry includes anon + authenticated).
--
-- Mechanism note: REVOKE FROM PUBLIC is the part that actually closes anon; the
-- explicit anon/authenticated grants are revoked too where present.

-- Fix D. check_rate_limit: called only by edge functions on the service role.
-- Anon could otherwise inflate any victim's rate-limit counter.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;

-- Fix E. has_meaningful_data: called by the frontend AFTER login
-- (useOnboardingTrigger.js, Onboarding.jsx), so authenticated MUST keep EXECUTE.
-- Close anon (an existence oracle) only.
REVOKE EXECUTE ON FUNCTION public.has_meaningful_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_meaningful_data(uuid) TO authenticated;

-- Fix F. is_blocked_pair: called inside the friendships_respect_blocks INSERT
-- RLS policy, which runs with the querying role's privileges, so authenticated
-- MUST keep EXECUTE or friend requests break. Close PUBLIC + anon only.
REVOKE EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) TO authenticated;

-- Fix F. reconcile_stuck_shares: pg_cron only (runs as postgres). No app caller.
REVOKE EXECUTE ON FUNCTION public.reconcile_stuck_shares() FROM PUBLIC, anon, authenticated;

-- Fix F. send_email_hook() (NO-ARG overload only): the exposed one. Do NOT touch
-- send_email_hook(event jsonb), which is the real auth hook locked to
-- supabase_auth_admin.
REVOKE EXECUTE ON FUNCTION public.send_email_hook() FROM PUBLIC, anon, authenticated;
