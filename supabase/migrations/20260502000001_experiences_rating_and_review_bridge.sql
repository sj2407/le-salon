-- Portrait Feature: Experiences rating + Reviews→Experiences bridge
--
-- Mirrors the books bridge pattern (sync_review_to_books / cleanup_book_on_review_delete).
-- See migrations 20260303000002_portrait_books.sql and 20260429000001_review_delete_cleans_book.sql.
--
-- Adds:
--   1. experiences.rating (0–10, nullable) — entered by user after playbill scan or via review.
--   2. experiences.review_id (FK to reviews) — links a Portrait experience to its source review.
--   3. AFTER INSERT trigger sync_review_to_experiences — when a review with tag='performing_arts'
--      is inserted, create or link an experiences row.
--   4. BEFORE DELETE trigger cleanup_experience_on_review_delete — when a performing_arts
--      review is deleted, remove the experience it created (only if source='review' and no
--      sibling review references it).
--
-- The experiences.source CHECK was hand-extended on the live DB to include
-- 'review' and 'playbill_scan' before this migration was authored. The original
-- migration 20260303000003_portrait_experiences.sql:17 only allowed
-- ('activity_board','manual'), so a fresh rebuild from migrations would fail
-- the CHECK on the new INSERTs below. Drop and recreate the constraint here so
-- migrations are self-consistent. Idempotent: drop is no-op if absent.

ALTER TABLE public.experiences
  DROP CONSTRAINT IF EXISTS experiences_source_check;

ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_source_check
    CHECK (source IN ('activity_board', 'manual', 'playbill_scan', 'review'));

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS rating NUMERIC
    CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10));

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_experiences_review
  ON public.experiences(review_id) WHERE review_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- AFTER INSERT trigger: review (tag='performing_arts') → experiences row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_review_to_experiences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
BEGIN
  IF NEW.tag != 'performing_arts' THEN
    RETURN NEW;
  END IF;

  -- Dedup by case-insensitive name match. If the user already has an experience
  -- (e.g. from playbill_scan or manual entry) with the same name, link it to
  -- this review and use the higher rating; do not create a duplicate row.
  SELECT id INTO v_existing_id FROM public.experiences
  WHERE user_id = NEW.user_id
    AND lower(name) = lower(trim(NEW.title))
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.experiences (user_id, name, category, source, rating, review_id)
    VALUES (NEW.user_id, trim(NEW.title), 'theatre', 'review', NEW.rating, NEW.id);
  ELSE
    UPDATE public.experiences SET
      review_id = COALESCE(experiences.review_id, NEW.id),
      rating = GREATEST(COALESCE(experiences.rating, 0), COALESCE(NEW.rating, 0))
    WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_review_to_experiences ON public.reviews;
CREATE TRIGGER trg_review_to_experiences
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_review_to_experiences();

-- ---------------------------------------------------------------------------
-- BEFORE DELETE trigger: clean up experiences row created by deleted review
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_experience_on_review_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_experience_id uuid;
  v_sibling_id uuid;
BEGIN
  IF OLD.tag != 'performing_arts' THEN
    RETURN OLD;
  END IF;

  -- Only consider experiences this review created (source='review' AND review_id=OLD.id).
  SELECT id INTO v_experience_id FROM public.experiences
  WHERE review_id = OLD.id AND source = 'review'
  LIMIT 1
  FOR UPDATE;

  IF v_experience_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Look for another performing_arts review by this user that resolves to the
  -- same experience (matched by case-insensitive title).
  SELECT r.id INTO v_sibling_id FROM public.reviews r
  JOIN public.experiences e ON e.id = v_experience_id
  WHERE r.user_id = OLD.user_id
    AND r.tag = 'performing_arts'
    AND r.id != OLD.id
    AND lower(trim(r.title)) = lower(e.name)
  LIMIT 1;

  IF v_sibling_id IS NOT NULL THEN
    -- Repoint to sibling review and keep the experience row.
    UPDATE public.experiences SET review_id = v_sibling_id WHERE id = v_experience_id;
  ELSE
    -- No sibling. Safe to remove the experience row this review created.
    DELETE FROM public.experiences WHERE id = v_experience_id;
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_review_delete_cleans_experience ON public.reviews;
CREATE TRIGGER trg_review_delete_cleans_experience
  BEFORE DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_experience_on_review_delete();
