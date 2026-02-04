// Utility functions for Weekly Friends Newsletter

/**
 * Calculate the current week period (Sunday 3pm to NOW)
 * Shows all activity from last Sunday 3pm until current moment
 * @returns {Object} { periodStart, periodEnd } as ISO strings
 */
export const getCurrentWeekPeriod = () => {
  const now = new Date()

  // Find most recent Sunday at 3pm (15:00)
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getHours()

  // Calculate days since last Sunday 3pm
  let daysSinceStart = currentDay
  if (currentDay === 0 && currentHour < 15) {
    // It's Sunday but before 3pm, so last period started 7 days ago
    daysSinceStart = 7
  }

  // Period starts at last Sunday 3pm
  const periodStart = new Date(now)
  periodStart.setDate(periodStart.getDate() - daysSinceStart)
  periodStart.setHours(15, 0, 0, 0)

  // Period ends NOW to capture all recent activity
  const periodEnd = now.toISOString()

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd
  }
}

/**
 * Get a human-readable label for a newsletter week
 * @param {string} periodEnd - ISO timestamp of period end
 * @returns {string} "This Week", "Last Week", or "Week of [date]"
 */
export const getWeekLabel = (periodEnd) => {
  const end = new Date(periodEnd)
  const now = new Date()
  const daysDiff = Math.floor((now - end) / (1000 * 60 * 60 * 24))

  if (daysDiff < 7) return 'This Week'
  if (daysDiff < 14) return 'Last Week'

  const month = end.toLocaleDateString('en-US', { month: 'short' })
  const day = end.getDate()
  const year = end.getFullYear()
  return `Week of ${month} ${day}, ${year}`
}

/**
 * Generate a human-readable description for a newsletter item
 * @param {Object} item - The item data (card/review/activity)
 * @param {string} itemType - 'card', 'review', or 'activity'
 * @returns {string} Description text
 */
export const generateDescription = (item, itemType) => {
  switch (itemType) {
    case 'card':
      // For cards, item should contain entry info
      if (item.entries && item.entries.length > 0) {
        const entry = item.entries[0]
        return `Updated "${entry.category}" to "${entry.content}"`
      }
      return 'Updated their card'

    case 'review':
      return `Rated "${item.title}" ${item.rating}/10`

    case 'activity':
      const cityText = item.city ? ` in ${item.city}` : ''
      return `Added "${item.description}"${cityText}`

    default:
      return ''
  }
}

/**
 * Detect what changed between two sets of card entries
 * Used to generate detailed descriptions for card updates
 * @param {Array} newEntries - Current card entries
 * @param {Array} oldEntries - Previous card entries (optional)
 * @returns {Array} List of changes with category and content
 */
export const detectCardChanges = (newEntries, oldEntries = []) => {
  if (!oldEntries || oldEntries.length === 0) {
    // No previous entries, all are new
    return newEntries.map(entry => ({
      category: entry.category,
      content: entry.content,
      subcategory: entry.subcategory
    }))
  }

  // Compare entries to find differences
  const changes = []
  const oldEntriesMap = new Map(
    oldEntries.map(e => [`${e.category}-${e.subcategory}`, e.content])
  )

  newEntries.forEach(newEntry => {
    const key = `${newEntry.category}-${newEntry.subcategory}`
    const oldContent = oldEntriesMap.get(key)

    if (!oldContent || oldContent !== newEntry.content) {
      changes.push({
        category: newEntry.category,
        content: newEntry.content,
        subcategory: newEntry.subcategory
      })
    }
  })

  return changes
}
