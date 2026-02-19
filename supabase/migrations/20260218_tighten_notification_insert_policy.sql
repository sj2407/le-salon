-- Tighten notification INSERT policy
-- OLD: WITH CHECK (true) — any authenticated user can create notifications impersonating anyone
-- NEW: WITH CHECK (auth.uid() = actor_id) — users can only create notifications as themselves
--
-- Pre-check: All 7 frontend INSERT sites verified to use actor_id: profile.id

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

CREATE POLICY "Authenticated users can insert notifications as themselves"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);
