-- Marginalia Feature: Card Notes Table
-- Run this in the Supabase SQL Editor

CREATE TABLE card_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  card_section TEXT NOT NULL, -- 'Reading', 'Listening', 'Watching', etc.
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, card_section, from_user_id) -- one note per friend per section
);

ALTER TABLE card_notes ENABLE ROW LEVEL SECURITY;

-- Users can view notes they sent or received
CREATE POLICY "Users can view own notes" ON card_notes
  FOR SELECT USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

-- Friends can create notes on friends' cards
CREATE POLICY "Users can create notes on friends cards" ON card_notes
  FOR INSERT WITH CHECK (
    auth.uid() = from_user_id AND
    to_user_id != from_user_id AND
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted' AND (
        (requester_id = auth.uid() AND recipient_id = to_user_id) OR
        (recipient_id = auth.uid() AND requester_id = to_user_id)
      )
    )
  );

-- Users can update their own notes
CREATE POLICY "Users can update own notes" ON card_notes
  FOR UPDATE USING (auth.uid() = from_user_id);

-- Card owners can mark notes as read
CREATE POLICY "Card owners can mark notes read" ON card_notes
  FOR UPDATE USING (auth.uid() = to_user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes" ON card_notes
  FOR DELETE USING (auth.uid() = from_user_id);

CREATE INDEX idx_card_notes_card_id ON card_notes(card_id);
CREATE INDEX idx_card_notes_to_user ON card_notes(to_user_id, is_read);

-- Update notifications type constraint to include 'card_note'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('friend_request', 'friend_accepted', 'activity_interest', 'recommendation', 'wishlist_claimed', 'card_note'));
