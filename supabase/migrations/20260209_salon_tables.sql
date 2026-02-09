-- The Salon Feature: Weekly Parlor + Commonplace Book
-- Run this in the Supabase dashboard SQL editor

-- salon_weeks: weekly parlor content
CREATE TABLE salon_weeks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_of DATE NOT NULL UNIQUE,
  parlor_title TEXT NOT NULL,
  parlor_body TEXT NOT NULL,
  parlor_quote TEXT,
  parlor_quote_attribution TEXT,
  parlor_further_reading JSONB DEFAULT '[]'::jsonb,
  parlor_sources JSONB DEFAULT '[]'::jsonb,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- parlor_responses: friend responses to the weekly text
CREATE TABLE parlor_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_week_id UUID NOT NULL REFERENCES salon_weeks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- commonplace_entries: shared notebook entries
CREATE TABLE commonplace_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_week_id UUID NOT NULL REFERENCES salon_weeks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- commonplace_last_seen: badge tracking for typewriter icon
CREATE TABLE commonplace_last_seen (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_salon_weeks_week_of ON salon_weeks(week_of DESC);
CREATE INDEX idx_salon_weeks_current ON salon_weeks(archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_parlor_responses_week ON parlor_responses(salon_week_id, created_at ASC);
CREATE INDEX idx_parlor_responses_user ON parlor_responses(user_id);
CREATE INDEX idx_commonplace_entries_week ON commonplace_entries(salon_week_id, created_at DESC);
CREATE INDEX idx_commonplace_entries_user ON commonplace_entries(user_id);

-- Enable RLS
ALTER TABLE salon_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE parlor_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE commonplace_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE commonplace_last_seen ENABLE ROW LEVEL SECURITY;

-- RLS: salon_weeks - any authenticated user can read
CREATE POLICY "Authenticated users can view salon weeks"
  ON salon_weeks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS: parlor_responses
CREATE POLICY "Users can view own and friends responses"
  ON parlor_responses FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = auth.uid() AND recipient_id = parlor_responses.user_id)
             OR (recipient_id = auth.uid() AND requester_id = parlor_responses.user_id))
    )
  );

CREATE POLICY "Users can insert own responses"
  ON parlor_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own responses"
  ON parlor_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own responses"
  ON parlor_responses FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: commonplace_entries
CREATE POLICY "Users can view own and friends entries"
  ON commonplace_entries FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = auth.uid() AND recipient_id = commonplace_entries.user_id)
             OR (recipient_id = auth.uid() AND requester_id = commonplace_entries.user_id))
    )
  );

CREATE POLICY "Users can insert own entries"
  ON commonplace_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON commonplace_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON commonplace_entries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: commonplace_last_seen
CREATE POLICY "Users can view own last_seen"
  ON commonplace_last_seen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own last_seen"
  ON commonplace_last_seen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own last_seen"
  ON commonplace_last_seen FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable Realtime for responses and entries
ALTER PUBLICATION supabase_realtime ADD TABLE parlor_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE commonplace_entries;
