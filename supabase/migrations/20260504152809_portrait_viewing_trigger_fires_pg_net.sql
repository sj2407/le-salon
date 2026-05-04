-- Trigger now fires pg_net to call viewing-enrich asynchronously after every
-- review-driven INSERT/UPDATE that needs enrichment. The HTTP request runs in
-- the background (pg_net is async); the edge function fetches TMDB and UPDATEs
-- the row directly. By the time the user opens their Portrait, the overview is
-- already populated.

CREATE OR REPLACE FUNCTION public.sync_review_to_viewing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_target_id uuid;
  v_type text;
  v_title text;
  v_watched date;
  v_needs_enrich boolean := false;
  v_supabase_url text;
  v_cron_secret text;
BEGIN
  IF NEW.tag NOT IN ('show', 'movie') THEN
    RETURN NEW;
  END IF;

  v_type := CASE WHEN NEW.tag = 'show' THEN 'tv' ELSE 'movie' END;
  v_title := trim(NEW.title);
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
    v_target_id := v_existing_id;
    -- Only enrich if the row still has no overview
    SELECT (tmdb_overview IS NULL) INTO v_needs_enrich
    FROM public.viewing WHERE id = v_target_id;
  ELSE
    INSERT INTO public.viewing
      (user_id, type, title, source, rating, review_id, status, cover_url, date_watched)
    VALUES
      (NEW.user_id, v_type, v_title, 'review', NEW.rating, NEW.id, 'watched', NEW.image_url, v_watched)
    RETURNING id INTO v_target_id;
    v_needs_enrich := true;
  END IF;

  -- Fire async enrichment via pg_net. Wrapped in try/catch-equivalent: any
  -- failure here must not abort the review insert. If it doesn't fire, the
  -- frontend page-load enricher will still pick the row up later.
  IF v_needs_enrich AND v_target_id IS NOT NULL THEN
    BEGIN
      SELECT decrypted_secret INTO v_supabase_url
        FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
      SELECT decrypted_secret INTO v_cron_secret
        FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;

      IF v_supabase_url IS NOT NULL AND v_cron_secret IS NOT NULL THEN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/viewing-enrich',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', v_cron_secret
          ),
          body := jsonb_build_object('viewing_id', v_target_id)
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Swallow — enrichment is best-effort, frontend page load is the safety net
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
