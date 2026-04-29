-- When a review is deleted, clean up the books row that the review created.
--
-- Background: sync_review_to_books (AFTER INSERT on reviews) creates a books
-- row when a book review is inserted. Until now there was no DELETE-side
-- counterpart, so deleted reviews left orphan rows in books that still showed
-- up in Portrait.
--
-- Rules:
--   1. Only act on book-tagged reviews.
--   2. Only consider books that were created BY this review
--      (source = 'review' AND review_id = OLD.id). Books from goodreads_csv,
--      bookshelf_import, or card sources are never deleted by this trigger.
--   3. Before deleting, check whether another review for the same parsed
--      (title, author) still exists. If so, repoint books.review_id to that
--      sibling instead of deleting the row.
--   4. The book row is locked FOR UPDATE to serialize concurrent deletes.
--
-- The title-parsing logic mirrors sync_review_to_books. KEEP IN SYNC if that
-- trigger's parsing changes. A future migration can extract the parsing into
-- a shared SQL function; until then, both copies must move together.

CREATE OR REPLACE FUNCTION public.cleanup_book_on_review_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_book_id uuid;
  v_book_title text;
  v_book_author text;
  v_sibling_id uuid;
  v_other_id uuid;
  v_other_title text;
  v_parsed_title text;
  v_parsed_author text;
BEGIN
  IF OLD.tag <> 'book' THEN
    RETURN OLD;
  END IF;

  -- Find the book this review created. Lock to serialize concurrent deletes.
  SELECT id, title, author
    INTO v_book_id, v_book_title, v_book_author
  FROM public.books
  WHERE review_id = OLD.id AND source = 'review'
  FOR UPDATE;

  IF v_book_id IS NULL THEN
    -- No matching book (e.g. the review pre-dated the books table, or the
    -- book was already cleaned up). Nothing to do.
    RETURN OLD;
  END IF;

  -- Walk through other book-tagged reviews for this user, parse each title,
  -- and look for a sibling that resolves to the same (title, author) as the
  -- book we are about to remove. Stop at the first match.
  FOR v_other_id, v_other_title IN
    SELECT id, title
    FROM public.reviews
    WHERE user_id = OLD.user_id
      AND tag = 'book'
      AND id <> OLD.id
    ORDER BY created_at ASC
  LOOP
    v_parsed_title := trim(v_other_title);
    v_parsed_author := NULL;

    IF v_parsed_title ~ E' by [A-Z]' THEN
      v_parsed_author := trim(regexp_replace(v_parsed_title, E'^.* by ([A-Z].*)$', E'\\1'));
      v_parsed_title  := trim(regexp_replace(v_parsed_title, E' by [A-Z][^,]*$', ''));
    ELSIF v_parsed_title ~ E', [A-Z][a-z]+ [A-Z]' THEN
      v_parsed_author := trim(regexp_replace(v_parsed_title, E'^.*, ([A-Z][a-z]+ [A-Z].*)$', E'\\1'));
      v_parsed_title  := trim(regexp_replace(v_parsed_title, E', [A-Z][a-z]+ [A-Z][^,]*$', ''));
    END IF;

    IF lower(v_parsed_title) = lower(v_book_title)
       AND lower(coalesce(v_parsed_author, '')) = lower(coalesce(v_book_author, '')) THEN
      v_sibling_id := v_other_id;
      EXIT;
    END IF;
  END LOOP;

  IF v_sibling_id IS NOT NULL THEN
    -- A sibling review still references this book. Repoint and keep the row.
    UPDATE public.books SET review_id = v_sibling_id WHERE id = v_book_id;
  ELSE
    -- No sibling. Safe to remove the book row this review created.
    DELETE FROM public.books WHERE id = v_book_id;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_review_delete_cleans_book
  BEFORE DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_book_on_review_delete();
