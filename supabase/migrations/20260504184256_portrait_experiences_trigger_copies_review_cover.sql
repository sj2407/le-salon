-- Trigger now copies NEW.image_url into experiences.image_url on insert
-- (mirrors sync_review_to_books). Future review-derived rows arrive with a
-- cover already; existing rows get covered by the experience-enrich Wikipedia
-- thumbnail path or remain manually-settable from the detail modal. Also
-- re-fires enrichment when image_url is missing on an existing row.
CREATE OR REPLACE FUNCTION public.sync_review_to_experiences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_target_id uuid;
  v_needs_enrich boolean := false;
  v_supabase_url text;
  v_cron_secret text;
BEGIN
  IF NEW.tag != 'performing_arts' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_id FROM public.experiences
  WHERE user_id = NEW.user_id
    AND lower(name) = lower(trim(NEW.title))
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.experiences (user_id, name, category, source, rating, review_id, image_url)
    VALUES (NEW.user_id, trim(NEW.title), 'theatre', 'review', NEW.rating, NEW.id, NEW.image_url)
    RETURNING id INTO v_target_id;
    v_needs_enrich := true;
  ELSE
    UPDATE public.experiences SET
      review_id = COALESCE(experiences.review_id, NEW.id),
      rating = GREATEST(COALESCE(experiences.rating, 0), COALESCE(NEW.rating, 0)),
      image_url = COALESCE(experiences.image_url, NEW.image_url)
    WHERE id = v_existing_id;
    v_target_id := v_existing_id;
    SELECT (wikipedia_description IS NULL OR image_url IS NULL) INTO v_needs_enrich
    FROM public.experiences WHERE id = v_target_id;
  END IF;

  IF v_needs_enrich AND v_target_id IS NOT NULL THEN
    BEGIN
      SELECT decrypted_secret INTO v_supabase_url
        FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
      SELECT decrypted_secret INTO v_cron_secret
        FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;

      IF v_supabase_url IS NOT NULL AND v_cron_secret IS NOT NULL THEN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/experience-enrich',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', v_cron_secret
          ),
          body := jsonb_build_object('experience_id', v_target_id)
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
