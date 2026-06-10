-- Security fix (Tier 2, follow-up): lock down get_showcase_data.
--
-- get_showcase_data returns the hardcoded showcase account's (Sarah's) public
-- data, used by the old empty-state/onboarding preview. That preview is no
-- longer used (owner confirmed June 10, 2026) and no code calls this function.
-- Close it to anon + authenticated; PUBLIC removal is what actually closes anon.

REVOKE EXECUTE ON FUNCTION public.get_showcase_data(text) FROM PUBLIC, anon, authenticated;
