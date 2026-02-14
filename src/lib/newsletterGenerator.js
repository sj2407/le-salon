import { supabase } from './supabase'

/**
 * Generate newsletter showing NEW friend activity.
 * - Same day = append to existing newsletter
 * - Tracks by content to prevent duplicates
 */
export const generateNewsletter = async (userId) => {
    // Step 1: Get today's date (for grouping)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD

    // Step 2: Fetch existing newsletters AND friendships in parallel
    const [newslettersResult, friendshipsResult] = await Promise.all([
      supabase.from('newsletters').select('id, period_end').eq('user_id', userId).order('period_end', { ascending: false }),
      supabase.from('friendships').select('requester_id, recipient_id').eq('status', 'accepted').or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    ])

    if (newslettersResult.error) throw newslettersResult.error
    if (friendshipsResult.error) throw friendshipsResult.error

    const existingNewsletters = newslettersResult.data
    const friendships = friendshipsResult.data

    if (!friendships || friendships.length === 0) {
      return null
    }

    const friendIds = friendships.map(f =>
      f.requester_id === userId ? f.recipient_id : f.requester_id
    )

    // Find today's newsletter if it exists
    const todaysNewsletter = existingNewsletters?.find(n =>
      n.period_end.split('T')[0] === todayStr
    )

    // Step 3: Get previously shown content AND all friend content in parallel
    const shownContent = new Set()

    const extractContent = (description) => {
      const matches = description?.match(/"([^"]+)"/g)
      if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1]
        return lastMatch.replace(/"/g, '').toLowerCase().trim()
      }
      return (description || '').toLowerCase().trim()
    }

    // Build parallel queries: previous items + cards + reviews + activities
    const parallelQueries = [
      // Previous items for dedup
      existingNewsletters && existingNewsletters.length > 0
        ? supabase.from('newsletter_items').select('friend_id, description').in('newsletter_id', existingNewsletters.map(n => n.id))
        : Promise.resolve({ data: [], error: null }),
      // Friend cards
      supabase.from('cards').select('id, user_id, created_at').in('user_id', friendIds).eq('is_current', true),
      // Friend reviews
      supabase.from('reviews').select('id, user_id, title, rating, created_at').in('user_id', friendIds),
      // Friend activities
      supabase.from('activities').select('id, user_id, description, city, created_at').in('user_id', friendIds).eq('is_archived', false)
    ]

    const [prevItemsResult, cardsResult, reviewsResult, activitiesResult] = await Promise.all(parallelQueries)

    if (prevItemsResult.error) throw prevItemsResult.error
    if (cardsResult.error) throw cardsResult.error
    if (reviewsResult.error) throw reviewsResult.error
    if (activitiesResult.error) throw activitiesResult.error

    // Build dedup set from previous items
    prevItemsResult.data?.forEach(item => {
      const contentText = extractContent(item.description)
      shownContent.add(`${item.friend_id}:${contentText}`)
    })

    // Step 4: Get ALL entries for ALL friend cards in ONE query (fixes N+1)
    const currentCards = cardsResult.data || []
    const cardIds = currentCards.map(c => c.id)
    const cardUserMap = Object.fromEntries(currentCards.map(c => [c.id, c]))

    let allEntries = []
    if (cardIds.length > 0) {
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('id, card_id, category, content, subcategory')
        .in('card_id', cardIds)
        .order('display_order')

      if (entriesError) throw entriesError
      allEntries = entriesData || []
    }

    // Step 5: Collect NEW friend activity
    const newItems = []

    // 5a. Process card entries
    for (const entry of allEntries) {
      const card = cardUserMap[entry.card_id]
      if (!card) continue
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

    // 5b. Process reviews
    for (const review of reviewsResult.data || []) {
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

    // 5c. Process activities
    for (const activity of activitiesResult.data || []) {
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
}
