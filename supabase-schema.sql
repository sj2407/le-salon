-- Interest Cards Database Schema

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards table
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_current BOOLEAN DEFAULT true,
  CONSTRAINT one_current_card_per_user UNIQUE (user_id, is_current) WHERE is_current = true
);

-- Entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT,
  content TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

-- Friendships table
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_friendship CHECK (requester_id != recipient_id),
  CONSTRAINT unique_friendship UNIQUE (requester_id, recipient_id)
);

-- Indexes for performance
CREATE INDEX idx_cards_user_current ON cards(user_id, is_current);
CREATE INDEX idx_cards_user_created ON cards(user_id, created_at DESC);
CREATE INDEX idx_entries_card ON entries(card_id);
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_recipient ON friendships(recipient_id);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Row Level Security Policies

-- Profiles: Users can read their own profile and profiles of friends
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view friends' profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = auth.uid() AND recipient_id = profiles.id)
             OR (recipient_id = auth.uid() AND requester_id = profiles.id))
    )
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Cards: Users can view their own cards and current cards of friends
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards" ON cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view friends' current cards" ON cards
  FOR SELECT USING (
    is_current = true AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = auth.uid() AND recipient_id = cards.user_id)
             OR (recipient_id = auth.uid() AND requester_id = cards.user_id))
    )
  );

CREATE POLICY "Users can insert their own cards" ON cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" ON cards
  FOR UPDATE USING (auth.uid() = user_id);

-- Entries: Users can view entries from cards they have access to
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entries from accessible cards" ON entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cards
      WHERE cards.id = entries.card_id
        AND (cards.user_id = auth.uid()
             OR (cards.is_current = true AND EXISTS (
               SELECT 1 FROM friendships
               WHERE status = 'accepted'
                 AND ((requester_id = auth.uid() AND recipient_id = cards.user_id)
                      OR (recipient_id = auth.uid() AND requester_id = cards.user_id))
             )))
    )
  );

CREATE POLICY "Users can insert entries in their own cards" ON entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards
      WHERE cards.id = entries.card_id AND cards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update entries in their own cards" ON entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cards
      WHERE cards.id = entries.card_id AND cards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete entries in their own cards" ON entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cards
      WHERE cards.id = entries.card_id AND cards.user_id = auth.uid()
    )
  );

-- Friendships: Users can view their own friendship requests
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert their own friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're part of" ON friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
