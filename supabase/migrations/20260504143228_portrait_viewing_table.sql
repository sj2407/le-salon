CREATE TABLE viewing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tv', 'movie')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'watched'
    CHECK (status IN ('watched', 'watching', 'want_to_watch')),
  rating NUMERIC CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10)),
  date_watched DATE,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'review')),
  tmdb_id TEXT,
  tmdb_overview TEXT,
  tmdb_release_year INT,
  cover_url TEXT,
  review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL,
  enrichment_attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_viewing_user_created ON viewing(user_id, created_at DESC);
CREATE INDEX idx_viewing_user_type ON viewing(user_id, type);
CREATE INDEX idx_viewing_review ON viewing(review_id) WHERE review_id IS NOT NULL;
CREATE UNIQUE INDEX idx_viewing_user_title_type ON viewing(user_id, lower(title), type);

ALTER TABLE viewing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own viewing" ON viewing FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own viewing" ON viewing FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own viewing" ON viewing FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete own viewing" ON viewing FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Friends can view viewing" ON viewing FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted' AND (
      (requester_id = auth.uid() AND recipient_id = viewing.user_id) OR
      (recipient_id = auth.uid() AND requester_id = viewing.user_id)
    )
  ));
