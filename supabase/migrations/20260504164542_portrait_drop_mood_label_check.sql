-- Phase 4: open mood vocabulary. The closed-list CHECK constraint
-- (Euphoric/Peaceful/Intense/Melancholic) is replaced by edge-function-side
-- shape validation in portrait-generate (1-3 words, ≤30 chars, no fillers).
ALTER TABLE public.spotify_profiles
  DROP CONSTRAINT IF EXISTS spotify_profiles_mood_label_check;

-- Add a soft length cap matching the function's validateResponse so anything
-- that bypasses the function (manual SQL, future code paths) can't store
-- runaway values. 60 chars is generous (function caps at 30).
ALTER TABLE public.spotify_profiles
  ADD CONSTRAINT spotify_profiles_mood_label_check
    CHECK (mood_label IS NULL OR length(mood_label) <= 60);
