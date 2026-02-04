-- Retroactive population of notifications for existing data
-- Only populate from last 60 days to avoid overwhelming users

-- 1. Create notifications for existing recommendations
INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_name, message, read, created_at)
SELECT DISTINCT
  rr.recommended_to_user_id as user_id,
  'recommendation' as type,
  r.user_id as actor_id,
  r.id as reference_id,
  r.title as reference_name,
  CONCAT(p.display_name, ' recommended ', r.title) as message,
  false as read,
  rr.created_at
FROM review_recommendations rr
JOIN reviews r ON r.id = rr.review_id
JOIN profiles p ON p.id = r.user_id
WHERE rr.created_at >= NOW() - INTERVAL '60 days'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = rr.recommended_to_user_id
      AND n.type = 'recommendation'
      AND n.reference_id = r.id
  );

-- 2. Create notifications for existing activity interests
INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_name, message, read, created_at)
SELECT DISTINCT
  a.user_id as user_id,
  'activity_interest' as type,
  ai.user_id as actor_id,
  a.id as reference_id,
  a.description as reference_name,
  CONCAT(p.display_name, ' is interested in ', a.description) as message,
  false as read,
  ai.created_at
FROM activity_interests ai
JOIN activities a ON a.id = ai.activity_id
JOIN profiles p ON p.id = ai.user_id
WHERE ai.created_at >= NOW() - INTERVAL '60 days'
  AND ai.user_id != a.user_id -- Don't notify users about their own activities
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = a.user_id
      AND n.type = 'activity_interest'
      AND n.reference_id = a.id
      AND n.actor_id = ai.user_id
  );

-- 3. Create notifications for existing accepted friendships (marked as read - old news)
INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_name, message, read, created_at)
SELECT DISTINCT
  f.requester_id as user_id,
  'friend_accepted' as type,
  f.recipient_id as actor_id,
  NULL as reference_id,
  NULL as reference_name,
  CONCAT(p.display_name, ' accepted your friend request') as message,
  true as read, -- Mark as read since these are old
  f.created_at
FROM friendships f
JOIN profiles p ON p.id = f.recipient_id
WHERE f.status = 'accepted'
  AND f.created_at >= NOW() - INTERVAL '60 days'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = f.requester_id
      AND n.type = 'friend_accepted'
      AND n.actor_id = f.recipient_id
  );

-- 4. Create notifications for wishlist claims (anonymous)
INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_name, message, read, created_at)
SELECT DISTINCT
  w.user_id as user_id,
  'wishlist_claimed' as type,
  w.claimed_by as actor_id,
  w.id as reference_id,
  w.name as reference_name,
  CONCAT('Someone claimed ', w.name, ' from your wishlist') as message,
  false as read,
  w.updated_at as created_at
FROM wishlist_items w
WHERE w.claimed_by IS NOT NULL
  AND w.updated_at >= NOW() - INTERVAL '60 days'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = w.user_id
      AND n.type = 'wishlist_claimed'
      AND n.reference_id = w.id
  );
