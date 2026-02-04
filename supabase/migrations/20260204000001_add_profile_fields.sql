-- Add new profile fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS favorite_books TEXT,
ADD COLUMN IF NOT EXISTS favorite_artists TEXT,
ADD COLUMN IF NOT EXISTS astro_sign TEXT,
ADD COLUMN IF NOT EXISTS spirit_animal TEXT,
ADD COLUMN IF NOT EXISTS favorite_quote TEXT;
