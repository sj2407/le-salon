-- Update sync_review_to_viewing to copy NEW.image_url into viewing.cover_url.
-- Reviews already store TMDB cover URLs; no need to call viewing-enrich for these rows.
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
        rating = GREATEST(COALESCE(viewing.rating, 0), NEW.rating),
        cover_url = COALESCE(viewing.cover_url, NEW.image_url)
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.viewing
      (user_id, type, title, source, rating, review_id, status, cover_url)
    VALUES
      (NEW.user_id, v_type, v_title, 'review', NEW.rating, NEW.id, 'watched', NEW.image_url);
  END IF;

  RETURN NEW;
END;
$function$;
