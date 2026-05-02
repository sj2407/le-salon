-- Allow recipients to dismiss/un-dismiss friend recommendations.
--
-- Adds:
--   1. review_recommendations.dismissed_at (TIMESTAMPTZ, nullable) — null means active.
--   2. UPDATE RLS policy so the recipient can toggle dismissed_at on their own rows.
--
-- Pre-existing RLS on review_recommendations:
--   - SELECT: recipient OR review owner
--   - INSERT: review owner (the recommender)
--   - DELETE: review owner
-- This migration adds UPDATE for the recipient.

ALTER TABLE public.review_recommendations
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_review_recommendations_active
  ON public.review_recommendations(recommended_to_user_id)
  WHERE dismissed_at IS NULL;

DROP POLICY IF EXISTS "Recipients can dismiss their recommendations"
  ON public.review_recommendations;

CREATE POLICY "Recipients can dismiss their recommendations"
  ON public.review_recommendations FOR UPDATE
  USING (recommended_to_user_id = (SELECT auth.uid()))
  WITH CHECK (recommended_to_user_id = (SELECT auth.uid()));
