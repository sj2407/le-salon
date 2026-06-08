-- Catch-up migration: share_tokens.expires_at
--
-- expires_at exists in production (added directly, outside the migration history)
-- and share-intake's resolveUser() filters on it (.gt('expires_at', now())).
-- Adding it here idempotently so a local `supabase db reset` matches production
-- and the edge function's token lookup does not throw on a fresh stack.
-- Default matches production exactly: now() + 1 year.

ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 year');
