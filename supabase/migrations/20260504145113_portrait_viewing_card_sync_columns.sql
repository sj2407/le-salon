-- Allow 'card' as a viewing.source value (alongside 'manual' and 'review').
ALTER TABLE public.viewing
  DROP CONSTRAINT IF EXISTS viewing_source_check;
ALTER TABLE public.viewing
  ADD CONSTRAINT viewing_source_check
    CHECK (source IN ('manual', 'review', 'card'));

-- Track which card entries have been pulled into the viewing table.
-- Once an entry is synced, we don't sync it again — even if the user deletes
-- the resulting viewing row. New entries (card_synced_at IS NULL) are pulled.
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS card_synced_at TIMESTAMPTZ;
