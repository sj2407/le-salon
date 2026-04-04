/**
 * Returns the route path for a notification click.
 * Shared by NotificationBell (dropdown) and Notifications (full page).
 */
export function getNotificationRoute(notification) {
  switch (notification.type) {
    case 'friend_request':
      return '/friends'
    case 'friend_accepted':
      return `/friend/${notification.actor_id}`
    case 'activity_interest':
    case 'new_activity':
      return '/todo'
    case 'recommendation':
      return '/my-corner?tab=liste'
    case 'wishlist_claimed':
      return '/wishlist'
    case 'card_note':
      return notification.reference_name === 'reply'
        ? `/friend/${notification.actor_id}`
        : '/my-corner'
    case 'review_comment':
      return notification.reference_name === 'reply'
        ? `/friend/${notification.actor_id}`
        : '/my-corner'
    default:
      return null
  }
}
