import { useState } from 'react'

export const TAG_ICONS = {
  movie: '🎬',
  book: '📖',
  podcast: '🎧',
  show: '📺',
  album: '💿',
  other: '✨'
}

const TAG_OPTIONS = ['movie', 'book', 'podcast', 'show', 'album', 'other']

/**
 * Shared reviews display component
 * Used by both My Corner (Reviews.jsx) and Friend View (FriendCard.jsx)
 *
 * Structure is fixed - renderHeaderActions and renderActions are absolute overlays
 * that don't affect the base layout.
 */
export const ReviewsDisplay = ({
  reviews,
  emptyMessage = 'No reviews yet.',
  emptyFilteredMessage,
  renderActions,
  renderHeaderActions
}) => {
  const [filterTag, setFilterTag] = useState('all')
  const [expandedReviews, setExpandedReviews] = useState(new Set())

  const toggleExpanded = (reviewId) => {
    const newExpanded = new Set(expandedReviews)
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId)
    } else {
      newExpanded.add(reviewId)
    }
    setExpandedReviews(newExpanded)
  }

  const filteredReviews = filterTag === 'all'
    ? reviews
    : reviews.filter(review => review.tag === filterTag)

  return (
    <div style={{ maxWidth: '720px', position: 'relative' }}>
      {/* Gavel - absolute positioned */}
      <img
        src="/images/gavel-ready.png"
        alt=""
        style={{
          position: 'absolute',
          top: '-20px',
          right: '15%',
          width: '72px',
          height: '72px',
          opacity: 0.3,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'gavelSway 5s ease-in-out infinite',
          filter: 'contrast(2.5) brightness(1.35)'
        }}
      />

      {/* Add button - absolute positioned, doesn't affect layout */}
      {renderHeaderActions && (
        <div style={{ position: 'absolute', top: '48px', right: '0', zIndex: 1 }}>
          {renderHeaderActions()}
        </div>
      )}

      {/* Filter dropdown - fixed structure */}
      <div style={{ marginTop: '32px', marginBottom: '20px' }}>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            background: '#FFFEFA',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All</option>
          {TAG_OPTIONS.map((tagOption) => (
            <option key={tagOption} value={tagOption}>
              {TAG_ICONS[tagOption]} {tagOption}
            </option>
          ))}
        </select>
      </div>

      {/* Reviews list */}
      {filteredReviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          {reviews.length === 0
            ? emptyMessage
            : (emptyFilteredMessage || `No ${filterTag} reviews yet.`)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredReviews.map((review, index) => (
            <div
              key={review.id}
              className="review-card"
              data-index={index}
              style={{
                background: '#FFFEFA',
                border: 'none',
                borderRadius: '2px',
                padding: '7px 16px',
                boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                position: 'relative'
              }}
            >
              {/* Review content row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{TAG_ICONS[review.tag]}</span>
                <h3 style={{ margin: 0, fontSize: '14px', fontStyle: 'italic', fontWeight: 400, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {review.title}
                </h3>
                <div className="handwritten" style={{ fontSize: '18px', lineHeight: 1, color: '#2C2C2C', flexShrink: 0 }}>
                  {review.rating}/10
                </div>
                {review.review_text && (
                  <button
                    onClick={() => toggleExpanded(review.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '16px',
                      color: '#4A7BA7',
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    {expandedReviews.has(review.id) ? '−' : '+'}
                  </button>
                )}
                {renderActions && renderActions(review)}
              </div>

              {/* Expanded review text */}
              {review.review_text && expandedReviews.has(review.id) && (
                <div style={{ marginTop: '12px', fontSize: '14px', lineHeight: 1.6, color: '#2C2C2C', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                  {review.review_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
