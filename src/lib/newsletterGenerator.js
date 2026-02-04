import { supabase } from './supabase'

/**
 * Generate a newsletter showing friend activity since the last newsletter
 * @param {string} userId - User's UUID
 * @param {string|null} cutoffTime - ISO timestamp to filter activity from (null = all time)
 * @returns {Object} Generated newsletter object or null
 */
export const generateNewsletter = async (userId, cutoffTime = null) => {
  try {
    // Step 1: Get accepted friends
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('requester_id, recipient_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)

    if (friendshipsError) throw friendshipsError

    if (!friendships || friendships.length === 0) {
      // No friends, create empty newsletter
      const { data: newsletter, error: newsletterError } = await supabase
        .from('newsletters')
        .insert({
          user_id: userId,
          period_start: cutoffTime || new Date().toISOString(),
          period_end: new Date().toISOString(),
          item_count: 0
        })
        .select()
        .single()

      if (newsletterError) throw newsletterError
      return newsletter
    }

    // Extract friend IDs
    const friendIds = friendships.map(f =>
      f.requester_id === userId ? f.recipient_id : f.requester_id
    )

    // Step 2: Collect friend activity since cutoff
    const items = []

    // 2a. Get card entries created since cutoff
    let cardsQuery = supabase
      .from('cards')
      .select('id, user_id, created_at')
      .in('user_id', friendIds)
      .eq('is_current', true)

    if (cutoffTime) {
      cardsQuery = cardsQuery.gte('created_at', cutoffTime)
    }

    const { data: currentCards, error: cardsError } = await cardsQuery

    if (cardsError) throw cardsError

    if (currentCards && currentCards.length > 0) {
      const cardIds = currentCards.map(c => c.id)
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('card_id, category, content, subcategory, created_at')
        .in('card_id', cardIds)
        .order('display_order')

      if (entriesError) throw entriesError

      // Group entries by card
      const entriesByCard = {}
      if (entries) {
        entries.forEach(entry => {
          if (!entriesByCard[entry.card_id]) {
            entriesByCard[entry.card_id] = []
          }
          entriesByCard[entry.card_id].push(entry)
        })
      }

      // Add card entries as items
      currentCards.forEach(card => {
        const cardEntries = entriesByCard[card.id] || []
        cardEntries.forEach(entry => {
          const subcatText = entry.subcategory ? ` (${entry.subcategory})` : ''
          items.push({
            friend_id: card.user_id,
            item_type: 'card',
            reference_id: card.id,
            description: `Updated "${entry.category}"${subcatText}: "${entry.content}"`,
            created_at: card.created_at
          })
        })
      })
    }

    // 2b. Get reviews since cutoff
    let reviewQuery = supabase
      .from('reviews')
      .select('id, user_id, title, rating, created_at')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })

    if (cutoffTime) {
      reviewQuery = reviewQuery.gte('created_at', cutoffTime)
    }

    const { data: reviews, error: reviewsError } = await reviewQuery

    if (reviewsError) throw reviewsError

    if (reviews) {
      reviews.forEach(review => {
        items.push({
          friend_id: review.user_id,
          item_type: 'review',
          reference_id: review.id,
          description: `Rated "${review.title}" ${review.rating}/10`,
          created_at: review.created_at
        })
      })
    }

    // 2c. Get activities since cutoff
    let activityQuery = supabase
      .from('activities')
      .select('id, user_id, description, city, created_at')
      .in('user_id', friendIds)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (cutoffTime) {
      activityQuery = activityQuery.gte('created_at', cutoffTime)
    }

    const { data: activities, error: activitiesError } = await activityQuery

    if (activitiesError) throw activitiesError

    if (activities) {
      activities.forEach(activity => {
        const cityText = activity.city ? ` in ${activity.city}` : ''
        items.push({
          friend_id: activity.user_id,
          item_type: 'activity',
          reference_id: activity.id,
          description: `Added "${activity.description}"${cityText}`,
          created_at: activity.created_at
        })
      })
    }

    // Step 3: Deduplicate items
    const uniqueItems = []
    const seen = new Set()

    items.forEach(item => {
      const key = `${item.friend_id}-${item.item_type}-${item.description}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueItems.push(item)
      }
    })

    // Step 4: Only create newsletter if there are new items
    if (uniqueItems.length === 0) {
      return null // No new activity, don't create empty newsletter
    }

    // Step 5: Create newsletter record
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .insert({
        user_id: userId,
        period_start: cutoffTime || new Date().toISOString(),
        period_end: new Date().toISOString(),
        item_count: uniqueItems.length
      })
      .select()
      .single()

    if (newsletterError) throw newsletterError

    // Step 6: Insert newsletter items
    const newsletterItems = uniqueItems.map((item, index) => ({
      newsletter_id: newsletter.id,
      friend_id: item.friend_id,
      item_type: item.item_type,
      reference_id: item.reference_id,
      description: item.description,
      display_order: index,
      created_at: item.created_at
    }))

    const { error: itemsError } = await supabase
      .from('newsletter_items')
      .insert(newsletterItems)

    if (itemsError) throw itemsError

    return newsletter
  } catch (error) {
    console.error('Error generating newsletter:', error)
    throw error
  }
}
