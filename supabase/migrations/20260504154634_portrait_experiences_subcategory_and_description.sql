ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS subcategory TEXT
    CHECK (subcategory IS NULL OR subcategory IN
      ('Play','Musical','Opera','Ballet','Stand-up','Concert','Exhibit'));

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS artist_name TEXT;

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS wikipedia_description TEXT;

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS wikipedia_url TEXT;

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS enrichment_attempted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_experiences_subcategory
  ON public.experiences(user_id, subcategory) WHERE subcategory IS NOT NULL;
