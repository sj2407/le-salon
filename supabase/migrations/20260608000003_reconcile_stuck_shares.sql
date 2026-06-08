-- Safety net for the async share intake: reconcile shares stuck mid-enrichment.
--
-- The background enrichment task UPDATEs the skeleton row to enrichment_status
-- 'done'/'failed'. If the edge isolate is recycled before that UPDATE lands, a
-- row can be left at 'enriching' forever. The in-function try/catch and the
-- beforeunload log are best-effort only; THIS sweeper is the actual guarantee.
--
-- Worst-case legitimate enrichment is ~20s (8s unfurl + max(12s Haiku, 5s image)).
-- A 2-minute threshold leaves wide margin while never lingering long.

CREATE OR REPLACE FUNCTION reconcile_stuck_shares()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE pending_shares
  SET enrichment_status = 'failed',
      needs_review = TRUE
  WHERE enrichment_status = 'enriching'
    AND created_at < now() - interval '2 minutes';
$$;

-- Schedule every minute (pg_cron minimum). Idempotent: drop any prior job first.
DO $$
BEGIN
  PERFORM cron.unschedule('reconcile-stuck-shares')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-stuck-shares');
END $$;

SELECT cron.schedule('reconcile-stuck-shares', '* * * * *', $$SELECT reconcile_stuck_shares()$$);
