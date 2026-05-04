-- Trigger: also set viewing.date_watched from NEW.created_at on insert,
-- so the monthly portrait can slice rows by when they were watched.
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
  v_watched date;
BEGIN
  IF NEW.tag NOT IN ('show', 'movie') THEN
    RETURN NEW;
  END IF;

  v_type := CASE WHEN NEW.tag = 'show' THEN 'tv' ELSE 'movie' END;
  v_title := trim(NEW.title);
  -- Use review creation date as the watched-date proxy (best signal we have).
  v_watched := COALESCE(NEW.created_at::date, CURRENT_DATE);

  SELECT id INTO v_existing_id FROM public.viewing
  WHERE user_id = NEW.user_id
    AND lower(title) = lower(v_title)
    AND type = v_type
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.viewing
    SET review_id = COALESCE(viewing.review_id, NEW.id),
        rating = GREATEST(COALESCE(viewing.rating, 0), NEW.rating),
        cover_url = COALESCE(viewing.cover_url, NEW.image_url),
        date_watched = COALESCE(viewing.date_watched, v_watched)
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.viewing
      (user_id, type, title, source, rating, review_id, status, cover_url, date_watched)
    VALUES
      (NEW.user_id, v_type, v_title, 'review', NEW.rating, NEW.id, 'watched', NEW.image_url, v_watched);
  END IF;

  RETURN NEW;
END;
$function$;
