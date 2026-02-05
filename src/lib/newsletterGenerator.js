import { supabase } from './supabase'

/**
 * Generate newsletter showing NEW friend activity.
 * - Same day = append to existing newsletter
 * - Tracks by content to prevent duplicates
 */
export const generateNewsletter = async (userId) => {
  try {
    // Step 1: Get today's date (for grouping)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD

    // Step 2: Check if we already have a newsletter for today
    const { data: existingNewsletters, error: nlError } = await supabase
      .from('newsletters')
      .select('id, period_end')
      .eq('user_id', userId)
      .order('period_end', { ascending: false })

    if (nlError) throw nlError

    // Find today's newsletter if it exists
    const todaysNewsletter = existingNewsletters?.find(n =>
      n.period_end.split('T')[0] === todayStr
    )

    // Step 3: Get ALL previously shown content
    const shownContent = new Set()

    const extractContent = (description) => {
      const matches = description?.match(/"([^"]+)"/g)
      if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1]
        return lastMatch.replace(/"/g, '').toLowerCase().trim()
      }
      return (description || '').toLowerCase().trim()
    }

    if (existingNewsletters && existingNewsletters.length > 0) {
      const newsletterIds = existingNewsletters.map(n => n.id)

      const { data: previousItems, error: prevError } = await supabase
        .from('newsletter_items')
        .select('friend_id, description')
        .in('newsletter_id', newsletterIds)

      if (prevError) throw prevError

      previousItems?.forEach(item => {
        const contentText = extractContent(item.description)
        shownContent.add(`${item.friend_id}:${contentText}`)
      })
    }

    // Step 4: Get accepted friends
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('requester_id, recipient_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)

    if (friendshipsError) throw friendshipsError

    if (!friendships || friendships.length === 0) {
      return null
    }

    const friendIds = friendships.map(f =>
      f.requester_id === userId ? f.recipient_id : f.requester_id
    )

    // Step 5: Collect NEW friend activity
    const newItems = []

    // 5a. Get current card entries
    const { data: currentCards, error: cardsError } = await supabase
      .from('cards')
      .select('id, user_id, created_at')
      .in('user_id', friendIds)
      .eq('is_current', true)

    if (cardsError) throw cardsError

    for (const card of currentCards || []) {
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('id, category, content, subcategory')
        .eq('card_id', card.id)
        .order('display_order')

      if (entriesError) throw entriesError

      for (const entry of entries || []) {
        const contentKey = `${card.user_id}:${entry.content.toLowerCase().trim()}`

        if (shownContent.has(contentKey)) continue

        const sub = entry.subcategory ? ` (${entry.subcategory})` : ''
        newItems.push({
          friend_id: card.user_id,
          item_type: 'card',
          reference_id: entry.id,
          description: `${entry.category}${sub}: "${entry.content}"`,
          created_at: card.created_at
        })
      }
    }

    // 5b. Get reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, user_id, title, rating, created_at')
      .in('user_id', friendIds)

    if (reviewsError) throw reviewsError

    for (const review of reviews || []) {
      const contentKey = `${review.user_id}:${review.title.toLowerCase().trim()}`

      if (shownContent.has(contentKey)) continue

      newItems.push({
        friend_id: review.user_id,
        item_type: 'review',
        reference_id: review.id,
        description: `Rated "${review.title}" ${review.rating}/10`,
        created_at: review.created_at
      })
    }

    // 5c. Get activities
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, user_id, description, city, created_at')
      .in('user_id', friendIds)
      .eq('is_archived', false)

    if (activitiesError) throw activitiesError

    for (const activity of activities || []) {
      const contentKey = `${activity.user_id}:${activity.description.toLowerCase().trim()}`

      if (shownContent.has(contentKey)) continue

      const cityText = activity.city ? ` in ${activity.city}` : ''
      newItems.push({
        friend_id: activity.user_id,
        item_type: 'activity',
        reference_id: activity.id,
        description: `Added "${activity.description}"${cityText}`,
        created_at: activity.created_at
      })
    }

    // Step 6: No new items = nothing to do
    if (newItems.length === 0) {
      return todaysNewsletter || null
    }

    // Step 7: Either append to today's newsletter or create new one
    let newsletter = todaysNewsletter

    if (!newsletter) {
      const { data: newNl, error: nlCreateError } = await supabase
        .from('newsletters')
        .insert({
          user_id: userId,
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          item_count: newItems.length
        })
        .select()
        .single()

      if (nlCreateError) throw nlCreateError
      newsletter = newNl
    } else {
      // Update item count
      await supabase
        .from('newsletters')
        .update({
          item_count: (newsletter.item_count || 0) + newItems.length,
          period_end: new Date().toISOString()
        })
        .eq('id', newsletter.id)
    }

    // Step 8: Insert new items
    const itemsToInsert = newItems.map((item, index) => ({
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
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    return newsletter

  } catch (error) {
    console.error('Error generating newsletter:', error)
    throw error
  }
}
