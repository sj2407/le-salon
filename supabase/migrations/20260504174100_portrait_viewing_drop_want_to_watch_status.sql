-- Remove 'want_to_watch' from the viewing.status CHECK. The Portrait Viewing
-- section is meant to capture what the user IS / HAS consumed, not a wishlist.
-- 'La Liste' (discovery_items) is the wishlist surface.
ALTER TABLE public.viewing
  DROP CONSTRAINT IF EXISTS viewing_status_check;
ALTER TABLE public.viewing
  ADD CONSTRAINT viewing_status_check
    CHECK (status IN ('watched', 'watching'));
