-- Portrait Feature: Creations table
-- See docs/portrait-interface-contract.ts for column shapes.
--
-- User-authored original work: poems, short prose, screenshots, photos, drawings.
-- Each creation has a visibility toggle (eye icon, same as La Liste).
-- Friends see only items marked visible. Hidden items invisible in friend view.

CREATE TABLE creations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'image')),
  title TEXT CHECK (title IS NULL OR char_length(title) <= 80),
  text_content TEXT CHECK (text_content IS NULL OR char_length(text_content) <= 2000),
  image_url TEXT,                    -- Supabase Storage URL (creation-images bucket)
  is_visible BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure content exists for the given type
  CONSTRAINT creations_content_check CHECK (
    (type = 'text' AND text_content IS NOT NULL) OR
    (type = 'image' AND image_url IS NOT NULL)
  )
);

-- Common query patterns
CREATE INDEX idx_creations_user_visible ON creations(user_id, is_visible, created_at DESC);
CREATE INDEX idx_creations_user_created ON creations(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;

-- Owner: full access (sees all own creations including hidden)
CREATE POLICY "Owner can view own creations"
  ON creations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own creations"
  ON creations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own creations"
  ON creations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own creations"
  ON creations FOR DELETE
  USING (auth.uid() = user_id);

-- Friends: read-only, visible items only
CREATE POLICY "Friends can view visible creations"
  ON creations FOR SELECT
  USING (
    is_visible = TRUE
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = auth.uid() AND recipient_id = creations.user_id)
             OR (recipient_id = auth.uid() AND requester_id = creations.user_id))
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for creation images
-- ---------------------------------------------------------------------------
-- Run separately in Supabase dashboard or via CLI:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('creation-images', 'creation-images', true);
--
-- Storage policies (run in dashboard):
--   CREATE POLICY "Users can upload own creation images"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'creation-images' AND auth.uid()::text = (storage.foldername(name))[1]);
--
--   CREATE POLICY "Anyone can view creation images"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'creation-images');
--
--   CREATE POLICY "Users can delete own creation images"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'creation-images' AND auth.uid()::text = (storage.foldername(name))[1]);
