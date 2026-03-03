-- Portrait Feature: Experiences table
-- See docs/portrait-interface-contract.ts for column shapes.
--
-- Past cultural events displayed in the Portrait tab.
-- Separate from the `activities` table (which tracks upcoming events on the Activity Board).
-- Sources: archived activities from the Activity Board, or manually added from Portrait.

CREATE TABLE experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('concert', 'exhibition', 'restaurant', 'cinema', 'theatre', 'other')),
  date DATE,
  city TEXT,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('activity_board', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Common query patterns
CREATE INDEX idx_experiences_user_created ON experiences(user_id, created_at DESC);
CREATE INDEX idx_experiences_user_category ON experiences(user_id, category);

-- Enable RLS
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

-- Owner: full access
CREATE POLICY "Owner can view own experiences"
  ON experiences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own experiences"
  ON experiences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own experiences"
  ON experiences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own experiences"
  ON experiences FOR DELETE
  USING (auth.uid() = user_id);

-- Friends: read-only (for viewing friend's Portrait experiences section)
CREATE POLICY "Friends can view experiences"
  ON experiences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = auth.uid() AND recipient_id = experiences.user_id)
             OR (recipient_id = auth.uid() AND requester_id = experiences.user_id))
    )
  );
