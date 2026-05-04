-- Trigger now copies review.image_url into books.cover_url on INSERT,
-- and on the dedup UPDATE branch only fills cover_url if it's currently NULL
-- (so any manually-picked cover or earlier enrichment stays put).
-- Without this, book-enrich-batch sees cover_url=NULL on review-derived books
-- and may pick the wrong title (different book sharing the same name).
CREATE OR REPLACE FUNCTION public.sync_review_to_books()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_author text;
  v_existing_id uuid;
BEGIN
  IF NEW.tag != 'book' THEN
    RETURN NEW;
  END IF;

  v_title := trim(NEW.title);
  v_author := NULL;

  IF v_title ~ E' by [A-Z]' THEN
    v_author := trim(regexp_replace(v_title, E'^.* by ([A-Z].*)$', E'\\1'));
    v_title := trim(regexp_replace(v_title, E' by [A-Z][^,]*$', ''));
  ELSIF v_title ~ E', [A-Z][a-z]+ [A-Z]' THEN
    v_author := trim(regexp_replace(v_title, E'^.*, ([A-Z][a-z]+ [A-Z].*)$', E'\\1'));
    v_title := trim(regexp_replace(v_title, E', [A-Z][a-z]+ [A-Z][^,]*$', ''));
  END IF;

  SELECT id INTO v_existing_id FROM books
  WHERE user_id = NEW.user_id
    AND lower(title) = lower(v_title)
    AND lower(coalesce(author, '')) = lower(coalesce(v_author, ''));

  IF v_existing_id IS NULL THEN
    INSERT INTO books (user_id, title, author, source, status, rating, review_id, date_read, cover_url)
    VALUES (NEW.user_id, v_title, v_author, 'review', 'read', NEW.rating, NEW.id, CURRENT_DATE, NEW.image_url);
  ELSE
    UPDATE books SET
      review_id = COALESCE(books.review_id, NEW.id),
      rating = GREATEST(COALESCE(books.rating, 0), COALESCE(NEW.rating, 0)),
      date_read = COALESCE(books.date_read, CURRENT_DATE),
      cover_url = COALESCE(books.cover_url, NEW.image_url)
    WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$function$;
