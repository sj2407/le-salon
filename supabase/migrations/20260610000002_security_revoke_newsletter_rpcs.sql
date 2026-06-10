-- Security fix (Tier 1, Fix C): stop anon from triggering email blasts / sync.
--
-- send_weekly_newsletter(), preview_weekly_newsletter(text), and
-- monthly_spotify_sync() are SECURITY DEFINER and were executable by PUBLIC
-- (the `=X/postgres` ACL entry, which includes anon + authenticated). Anyone
-- could trigger the full weekly email blast to every user, a preview email to
-- any address, or a Spotify resync on demand (Resend cost, email bombing).
--
-- These are invoked by pg_cron as the postgres role (jobs: weekly-newsletter,
-- monthly-spotify-sync), which is the table owner and unaffected by these
-- REVOKEs. No frontend or edge function calls them. Revoke from PUBLIC (the
-- part that actually closes anon) plus the explicit anon/authenticated grants.

REVOKE EXECUTE ON FUNCTION public.send_weekly_newsletter() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.preview_weekly_newsletter(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.monthly_spotify_sync() FROM PUBLIC, anon, authenticated;
