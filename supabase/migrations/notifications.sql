-- Create notifications table
create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('friend_request', 'friend_accepted', 'activity_interest', 'recommendation', 'wishlist_claimed')),
  actor_id uuid references auth.users(id) on delete cascade not null,
  reference_id uuid,
  reference_name text,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- Index for fast lookups
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_user_unread on notifications(user_id, read) where read = false;

-- RLS Policies
alter table notifications enable row level security;

-- Users can only read their own notifications
create policy "Users can view own notifications"
  on notifications for select
  using (auth.uid() = user_id);

-- Users can only update their own notifications (mark as read)
create policy "Users can update own notifications"
  on notifications for update
  using (auth.uid() = user_id);
