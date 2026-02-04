// Utility functions for Friends Newsletter

/**
 * Get a human-readable label for a newsletter
 * @param {string} periodEnd - ISO timestamp of period end
 * @param {boolean} isLatest - Whether this is the most recent newsletter
 * @returns {string} Label for the newsletter section
 */
export const getWeekLabel = (periodEnd, isLatest = false) => {
  if (isLatest) return 'Latest updates'

  const end = new Date(periodEnd)
  const now = new Date()
  const diffDays = Math.floor((now - end) / 86400000)

  if (diffDays === 0) return 'Earlier today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  const month = end.toLocaleDateString('en-US', { month: 'short' })
  const day = end.getDate()
  const year = end.getFullYear()
  return `${month} ${day}, ${year}`
}
