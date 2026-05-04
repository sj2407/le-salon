-- Add 'note' (optional textarea) to books and viewing so all three portrait
-- surfaces (Reading, Viewing, Experiences) can capture a free-text reflection.
-- Experience already has a 'note' column.
ALTER TABLE public.books   ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.viewing ADD COLUMN IF NOT EXISTS note text;

-- Drop 'want_to_read' from the books.status CHECK. The Portrait captures what
-- the user IS or HAS consumed; wishlist items belong on La Liste. Mirrors the
-- viewing.status tightening from 20260504174100.
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_status_check;
ALTER TABLE public.books
  ADD CONSTRAINT books_status_check
    CHECK (status IN ('reading', 'read'));
