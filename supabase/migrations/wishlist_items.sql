-- Create wishlist_items table
create table wishlist_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  link text,
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table wishlist_items enable row level security;

-- Policy: Users can view their own wishlist items
create policy "Users can view own wishlist items"
  on wishlist_items
  for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own wishlist items
create policy "Users can insert own wishlist items"
  on wishlist_items
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own wishlist items
create policy "Users can update own wishlist items"
  on wishlist_items
  for update
  using (auth.uid() = user_id);

-- Policy: Users can delete their own wishlist items
create policy "Users can delete own wishlist items"
  on wishlist_items
  for delete
  using (auth.uid() = user_id);

-- Policy: Friends can view wishlist items of their friends
create policy "Friends can view friend wishlist items"
  on wishlist_items
  for select
  using (
    exists (
      select 1 from friendships
      where status = 'accepted'
      and (
        (requester_id = auth.uid() and recipient_id = wishlist_items.user_id)
        or
        (recipient_id = auth.uid() and requester_id = wishlist_items.user_id)
      )
    )
  );

-- Policy: Friends can update claimed_by field only
create policy "Friends can claim/unclaim items"
  on wishlist_items
  for update
  using (
    exists (
      select 1 from friendships
      where status = 'accepted'
      and (
        (requester_id = auth.uid() and recipient_id = wishlist_items.user_id)
        or
        (recipient_id = auth.uid() and requester_id = wishlist_items.user_id)
      )
    )
  )
  with check (
    -- Only allow updating claimed_by field
    user_id = wishlist_items.user_id
    and name = wishlist_items.name
    and link is not distinct from wishlist_items.link
  );

-- Create index for faster lookups
create index wishlist_items_user_id_idx on wishlist_items(user_id);
create index wishlist_items_claimed_by_idx on wishlist_items(claimed_by);
