-- Async share intake: enrichment_status + realtime replica identity
--
-- The share-intake edge function now inserts a skeleton row synchronously and
-- returns immediately, then enriches (unfurl + classify + image rehost) in a
-- background task that UPDATEs the row. enrichment_status tracks that lifecycle.
--
-- DEFAULT 'done' is intentional: any insert path that is NOT the new async
-- skeleton (including all pre-existing rows) is treated as already-enriched.
-- Do NOT change the default to 'enriching' — only the skeleton insert sets that.

ALTER TABLE pending_shares
  ADD COLUMN enrichment_status TEXT NOT NULL DEFAULT 'done'
    CHECK (enrichment_status = ANY (ARRAY['enriching', 'done', 'failed']));

-- Realtime UPDATE delivery: the client fills the row in when enrichment
-- completes. REPLICA IDENTITY FULL guarantees the old tuple is present so the
-- user_id filter + RLS authorize the UPDATE event reliably (not just the PK).
-- Low cost at this table's volume.
ALTER TABLE pending_shares REPLICA IDENTITY FULL;
