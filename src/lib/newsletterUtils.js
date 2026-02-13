// Utility functions for Friends Newsletter

/**
 * Get a human-readable label for a newsletter
 * @param {string} periodEnd - ISO timestamp of period end
 * @param {boolean} isLatest - Whether this is the most recent newsletter
 * @returns {string} Label for the newsletter section
 */
export const getWeekLabel = (periodEnd) => {
  const end = new Date(periodEnd)

  // Format the actual date
  const month = end.toLocaleDateString('en-US', { month: 'short' })
  const day = end.getDate()
  const year = end.getFullYear()

  return `${month} ${day}, ${year}`
}
