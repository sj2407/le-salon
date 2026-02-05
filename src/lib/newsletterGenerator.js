import { supabase } from './supabase'

/**
 * Generate a newsletter showing friend activity since the last newsletter
 * Only creates a new newsletter if:
 * 1. No newsletter exists yet, OR
 * 2. Last newsletter is older than 1 hour AND there's new activity
 *
 * @param {string} userId - User's UUID
 * @returns {Object} Generated newsletter object or null
 */
export const generateNewsletter = async (userId) => {
  try {
    // Step 1: Check if we recently generated a newsletter (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: recentNewsletter, error: recentError } = await supabase
      .from('newsletters')
      .select('id, period_end')
      .eq('user_id', userId)
      .gte('period_end', oneHourAgo)
      .order('period_end', { ascending: false })
      .limit(1)
      .single()

    if (recentError && recentError.code !== 'PGRST116') {
      throw recentError
    }

    // If we have a recent newsletter, don't generate a new one
    if (recentNewsletter) {
      return null
    }

    // Step 2: Get the cutoff time from the last newsletter (any age)
    const { data: lastNewsletter, error: lastError } = await supabase
      .from('newsletters')
      .select('period_end')
      .eq('user_id', userId)
      .order('period_end', { ascending: false })
      .limit(1)
      .single()

    if (lastError && lastError.code !== 'PGRST116') {
      throw lastError
    }

    const cutoffTime = lastNewsletter?.period_end || null

    // Step 3: Get all items that were already shown in previous newsletters
    const { data: previousItems, error: prevItemsError } = await supabase
      .from('newsletter_items')
      .select('reference_id, item_type')
      .eq('friend_id', userId) // This won't work - need to get all items for this user's newsletters

    // Actually, let's get items from all newsletters belonging to this user
    const { data: userNewsletters } = await supabase
      .from('newsletters')
      .select('id')
      .eq('user_id', userId)

    const shownItems = new Set()
    if (userNewsletters && userNewsletters.length > 0) {
      const newsletterIds = userNewsletters.map(n => n.id)
      const { data: allPreviousItems } = await supabase
        .from('newsletter_items')
        .select('reference_id, item_type')
        .in('newsletter_id', newsletterIds)

      if (allPreviousItems) {
        allPreviousItems.forEach(item => {
          shownItems.add(`${item.item_type}-${item.reference_id}`)
        })
      }
    }

    // Step 4: Get accepted friends
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('requester_id, recipient_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)

    if (friendshipsError) throw friendshipsError

    if (!friendships || friendships.length === 0) {
      return null // No friends, no newsletter needed
    }

    // Extract friend IDs
    const friendIds = friendships.map(f =>
      f.requester_id === userId ? f.recipient_id : f.requester_id
    )

    // Step 5: Collect friend activity
    const items = []

    // 5a. Get current cards from friends (created after cutoff if we have one)
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
        .select('card_id, category, content, subcategory')
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

      // Add card entries as items (skip if already shown)
      currentCards.forEach(card => {
        const cardEntries = entriesByCard[card.id] || []
        cardEntries.forEach(entry => {
          const itemKey = `card-${card.id}`
          if (!shownItems.has(itemKey)) {
            const subcatText = entry.subcategory ? ` (${entry.subcategory})` : ''
            items.push({
              friend_id: card.user_id,
              item_type: 'card',
              reference_id: card.id,
              description: `Updated "${entry.category}"${subcatText}: "${entry.content}"`,
              created_at: card.created_at
            })
          }
        })
      })
    }

    // 5b. Get reviews (created after cutoff if we have one)
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
        const itemKey = `review-${review.id}`
        if (!shownItems.has(itemKey)) {
          items.push({
            friend_id: review.user_id,
            item_type: 'review',
            reference_id: review.id,
            description: `Rated "${review.title}" ${review.rating}/10`,
            created_at: review.created_at
          })
        }
      })
    }

    // 5c. Get activities (created after cutoff if we have one)
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
        const itemKey = `activity-${activity.id}`
        if (!shownItems.has(itemKey)) {
          const cityText = activity.city ? ` in ${activity.city}` : ''
          items.push({
            friend_id: activity.user_id,
            item_type: 'activity',
            reference_id: activity.id,
            description: `Added "${activity.description}"${cityText}`,
            created_at: activity.created_at
          })
        }
      })
    }

    // Step 6: Deduplicate items within this batch
    const uniqueItems = []
    const seen = new Set()

    items.forEach(item => {
      const key = `${item.friend_id}-${item.item_type}-${item.reference_id}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueItems.push(item)
      }
    })

    // Step 7: Only create newsletter if there are new items
    if (uniqueItems.length === 0) {
      return null
    }

    // Step 8: Create newsletter record
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

    // Step 9: Insert newsletter items
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
