-- Security hygiene (Tier 3 cleanup): revoke direct EXECUTE on trigger-only
-- SECURITY DEFINER functions. These return type `trigger` and cannot be invoked
-- via PostgREST or a direct call, so this is not a functional security fix; it
-- just silences the linter's anon/authenticated_security_definer warnings.
--
-- Safe: triggers fire in the context of the table owner during INSERT/UPDATE/
-- DELETE, independent of these EXECUTE grants. Revoking does NOT disable the
-- triggers themselves.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_friends_new_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_push() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_review_to_books() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_review_to_experiences() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_review_to_viewing() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_book_on_review_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_experience_on_review_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_viewing_on_review_delete() FROM PUBLIC, anon, authenticated;
