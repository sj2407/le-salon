-- Trigger now fires pg_net to call experience-enrich asynchronously after a
-- review-driven INSERT/UPDATE so wikipedia_description lands without waiting
-- for the user's next Portrait load.
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
    INSERT INTO public.experiences (user_id, name, category, source, rating, review_id)
    VALUES (NEW.user_id, trim(NEW.title), 'theatre', 'review', NEW.rating, NEW.id)
    RETURNING id INTO v_target_id;
    v_needs_enrich := true;
  ELSE
    UPDATE public.experiences SET
      review_id = COALESCE(experiences.review_id, NEW.id),
      rating = GREATEST(COALESCE(experiences.rating, 0), COALESCE(NEW.rating, 0))
    WHERE id = v_existing_id;
    v_target_id := v_existing_id;
    SELECT (wikipedia_description IS NULL) INTO v_needs_enrich
    FROM public.experiences WHERE id = v_target_id;
  END IF;

  -- Fire async enrichment via pg_net. Best-effort: any failure here must not
  -- abort the review insert. Frontend page-load enricher is the safety net.
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
