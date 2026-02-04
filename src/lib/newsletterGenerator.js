import { supabase } from './supabase'

/**
 * Generate a newsletter showing changes since the last newsletter
 * @param {string} userId - User's UUID
 * @param {string} periodStart - ISO timestamp (for tracking purposes)
 * @param {string} periodEnd - ISO timestamp (for tracking purposes)
 * @returns {Object} Generated newsletter object or null
 */
export const generateNewsletter = async (userId, periodStart, periodEnd) => {
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
          period_start: periodStart,
          period_end: periodEnd,
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

    // Step 2: Get previous newsletter to compare against
    const { data: previousNewsletter } = await supabase
      .from('newsletters')
      .select('id, generated_at')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    const isFirstNewsletter = !previousNewsletter

    // Get items from previous newsletter if it exists
    let previousItemsByFriend = {}
    if (previousNewsletter) {
      const { data: prevItems } = await supabase
        .from('newsletter_items')
        .select('friend_id, item_type, description')
        .eq('newsletter_id', previousNewsletter.id)

      if (prevItems) {
        // Group previous items by friend
        prevItems.forEach(item => {
          if (!previousItemsByFriend[item.friend_id]) {
            previousItemsByFriend[item.friend_id] = []
          }
          previousItemsByFriend[item.friend_id].push(item.description)
        })
      }
    }

    // Step 3: Collect current content and detect changes
    const items = []

    // 3a. Get current cards for all friends
    const { data: currentCards, error: cardsError } = await supabase
      .from('cards')
      .select('id, user_id, created_at')
      .in('user_id', friendIds)
      .eq('is_current', true)

    if (cardsError) throw cardsError

    if (currentCards && currentCards.length > 0) {
      // Get entries for current cards
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

      // Compare current card entries to previous newsletter
      currentCards.forEach(card => {
        const cardEntries = entriesByCard[card.id] || []
        const previousDescriptions = previousItemsByFriend[card.user_id] || []

        cardEntries.forEach(entry => {
          const description = `Added "${entry.category}": "${entry.content}"`

          // For first newsletter, show everything
          // For subsequent newsletters, only show if not in previous newsletter
          if (isFirstNewsletter || !previousDescriptions.includes(description)) {
            items.push({
              friend_id: card.user_id,
              item_type: 'card',
              reference_id: card.id,
              description,
              created_at: card.created_at
            })
          }
        })
      })
    }

    // 3b. Get reviews
    let reviewQuery = supabase
      .from('reviews')
      .select('id, user_id, title, rating, created_at')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })

    // For subsequent newsletters, only get reviews created after previous newsletter
    if (previousNewsletter) {
      reviewQuery = reviewQuery.gte('created_at', previousNewsletter.generated_at)
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

    // 3c. Get activities
    let activityQuery = supabase
      .from('activities')
      .select('id, user_id, description, city, created_at')
      .in('user_id', friendIds)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    // For subsequent newsletters, only get activities created after previous newsletter
    if (previousNewsletter) {
      activityQuery = activityQuery.gte('created_at', previousNewsletter.generated_at)
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

    // Step 4: Deduplicate items
    const uniqueItems = []
    const seen = new Set()

    items.forEach(item => {
      const key = `${item.friend_id}-${item.item_type}-${item.description}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueItems.push(item)
      }
    })

    // Step 5: Create newsletter record
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .insert({
        user_id: userId,
        period_start: periodStart,
        period_end: periodEnd,
        item_count: uniqueItems.length
      })
      .select()
      .single()

    if (newsletterError) throw newsletterError

    // Step 6: Insert newsletter items
    if (uniqueItems.length > 0) {
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
    }

    return newsletter
  } catch (error) {
    console.error('Error generating newsletter:', error)
    throw error
  }
}
