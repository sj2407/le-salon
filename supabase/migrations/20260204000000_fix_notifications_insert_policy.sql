-- Add missing INSERT policy for notifications table
-- This allows authenticated users to create notifications for any user
-- which is necessary for friend requests, accepts, recommendations, etc.

create policy "Authenticated users can insert notifications"
  on notifications for insert
  to authenticated
  with check (true);
