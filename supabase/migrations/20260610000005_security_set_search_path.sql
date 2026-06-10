-- Security fix (Tier 3, Fix K): pin search_path on SECURITY DEFINER functions
-- flagged by the linter (function_search_path_mutable).
--
-- Config-only change (ALTER ... SET search_path); function bodies are untouched.
-- Verified each body: all cross-schema references (vault.*, net.*) are already
-- schema-qualified, and the only unqualified objects are public tables, so
-- `search_path = public` is behavior-preserving and merely makes the path
-- immutable (closes the search_path-hijack vector the linter warns about).

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.monthly_spotify_sync() SET search_path = public;
ALTER FUNCTION public.notify_friends_new_activity() SET search_path = public;
ALTER FUNCTION public.notify_push() SET search_path = public;
ALTER FUNCTION public.send_email_hook(event jsonb) SET search_path = public;
