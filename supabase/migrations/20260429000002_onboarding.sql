-- Onboarding: track first-time tour progress and a quick "any meaningful data?" check.
-- Idempotent. Additive only — no behavior change for existing users.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ;

-- has_meaningful_data: true if the user already has ANY content the app considers
-- "real activity." Used to decide whether to redirect to /onboarding on auth.
-- SECURITY DEFINER so the function can read tables that may be RLS-restricted from
-- the calling user's role. Returns boolean cheaply via short-circuit EXISTS.
--
-- discovery_items is guarded with to_regclass because its DDL lives outside this
-- repo (production-only at time of writing).
CREATE OR REPLACE FUNCTION has_meaningful_data(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_has BOOLEAN;
BEGIN
  SELECT
    EXISTS (SELECT 1 FROM entries e JOIN cards c ON c.id = e.card_id WHERE c.user_id = p_user_id LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE (requester_id = p_user_id OR recipient_id = p_user_id)
        AND status = 'accepted' LIMIT 1)
    OR EXISTS (SELECT 1 FROM reviews WHERE user_id = p_user_id LIMIT 1)
    OR EXISTS (SELECT 1 FROM wishlist_items WHERE user_id = p_user_id LIMIT 1)
    OR EXISTS (SELECT 1 FROM books WHERE user_id = p_user_id LIMIT 1)
    OR EXISTS (SELECT 1 FROM experiences WHERE user_id = p_user_id LIMIT 1)
    OR EXISTS (SELECT 1 FROM creations WHERE user_id = p_user_id LIMIT 1)
    OR EXISTS (SELECT 1 FROM spotify_profiles WHERE user_id = p_user_id AND is_active = true LIMIT 1)
    OR EXISTS (SELECT 1 FROM parlor_responses WHERE user_id = p_user_id LIMIT 1)
    OR EXISTS (SELECT 1 FROM pending_shares WHERE user_id = p_user_id LIMIT 1)
  INTO v_has;

  IF NOT v_has AND to_regclass('public.discovery_items') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM discovery_items WHERE user_id = $1 LIMIT 1)'
      INTO v_has USING p_user_id;
  END IF;

  RETURN v_has;
END;
$$;

GRANT EXECUTE ON FUNCTION has_meaningful_data(UUID) TO authenticated;
