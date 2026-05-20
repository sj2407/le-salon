-- Period year range + era label for each Parlor week.
-- The historical timeline (src/components/salon/HistoricalTimeline.jsx) positions
-- weeks by period_start_year / period_end_year and filters out null-year weeks.
-- These columns already exist in production; this migration captures them so a
-- database built fresh from migrations matches. Safe / idempotent.
ALTER TABLE salon_weeks
  ADD COLUMN IF NOT EXISTS period_start_year integer,
  ADD COLUMN IF NOT EXISTS period_end_year integer,
  ADD COLUMN IF NOT EXISTS era text;
