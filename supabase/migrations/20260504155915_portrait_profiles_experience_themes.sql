-- Mirror the existing reading_themes/reading_graph shape on profiles. The
-- experience-themes function will populate these alongside reading-themes.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience_themes JSONB,
  ADD COLUMN IF NOT EXISTS experience_themes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS experience_graph JSONB;
