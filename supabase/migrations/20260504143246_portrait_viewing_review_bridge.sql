-- AFTER INSERT trigger: review (tag IN ('show','movie')) → viewing row
CREATE OR REPLACE FUNCTION public.sync_review_to_viewing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_type text;
  v_title text;
BEGIN
  IF NEW.tag NOT IN ('show', 'movie') THEN
    RETURN NEW;
  END IF;

  v_type := CASE WHEN NEW.tag = 'show' THEN 'tv' ELSE 'movie' END;
  v_title := trim(NEW.title);

  SELECT id INTO v_existing_id FROM public.viewing
  WHERE user_id = NEW.user_id
    AND lower(title) = lower(v_title)
    AND type = v_type
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.viewing
    SET review_id = COALESCE(viewing.review_id, NEW.id),
        rating = GREATEST(COALESCE(viewing.rating, 0), NEW.rating)
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.viewing
      (user_id, type, title, source, rating, review_id, status)
    VALUES
      (NEW.user_id, v_type, v_title, 'review', NEW.rating, NEW.id, 'watched');
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_review_to_viewing ON public.reviews;
CREATE TRIGGER trg_sync_review_to_viewing
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_review_to_viewing();

-- BEFORE DELETE trigger: review delete → cleanup viewing row created by it
CREATE OR REPLACE FUNCTION public.cleanup_viewing_on_review_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_viewing_id uuid;
  v_sibling_id uuid;
  v_type text;
BEGIN
  IF OLD.tag NOT IN ('show', 'movie') THEN
    RETURN OLD;
  END IF;

  v_type := CASE WHEN OLD.tag = 'show' THEN 'tv' ELSE 'movie' END;

  SELECT id INTO v_viewing_id FROM public.viewing
  WHERE review_id = OLD.id AND source = 'review'
  LIMIT 1
  FOR UPDATE;

  IF v_viewing_id IS NULL THEN
    -- Manual viewing row was just linked to this review (source='manual').
    -- FK ON DELETE SET NULL handles detachment automatically.
    RETURN OLD;
  END IF;

  SELECT r.id INTO v_sibling_id
  FROM public.reviews r
  JOIN public.viewing v ON v.id = v_viewing_id
  WHERE r.user_id = OLD.user_id
    AND r.tag = OLD.tag
    AND lower(trim(r.title)) = lower(v.title)
    AND r.id != OLD.id
  LIMIT 1;

  IF v_sibling_id IS NOT NULL THEN
    UPDATE public.viewing SET review_id = v_sibling_id WHERE id = v_viewing_id;
  ELSE
    DELETE FROM public.viewing WHERE id = v_viewing_id;
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_cleanup_viewing_on_review_delete ON public.reviews;
CREATE TRIGGER trg_cleanup_viewing_on_review_delete
  BEFORE DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_viewing_on_review_delete();
