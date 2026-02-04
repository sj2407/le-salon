-- Add iTunes metadata columns to entries table for music previews
ALTER TABLE entries ADD COLUMN IF NOT EXISTS itunes_track_id TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS itunes_preview_url TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS itunes_artist_name TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS itunes_album_name TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS itunes_artwork_url TEXT;
