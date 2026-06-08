import { supabase } from './supabase'

// Default landing is /my-corner. If the user has pending shares queued (e.g.
// from the iOS share extension while logged out), route them to / so the
// PendingSharesCatchUp screen surfaces before they enter the app.
export const getPostLoginPath = async (userId) => {
  if (!userId) return '/my-corner'
  try {
    const { count, error } = await supabase
      .from('pending_shares')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      // Match PendingSharesCatchUp's own filter: skeleton rows still being
      // enriched are not shown there, so they must not drive the routing
      // decision either (else we route to an empty catch-up screen).
      .neq('enrichment_status', 'enriching')
    if (error) return '/my-corner'
    return count > 0 ? '/' : '/my-corner'
  } catch {
    return '/my-corner'
  }
}
