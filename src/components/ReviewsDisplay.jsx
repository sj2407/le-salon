import { useState, useEffect, useRef } from 'react'
import { TAG_ICONS, TAG_OPTIONS, TAG_LABELS } from '../lib/reviewConstants'
import { EmptyStateFantom } from './EmptyStateFantom'
import { FilterDropdown } from './FilterDropdown'
import { CoverThumbnail } from './cover-search/CoverThumbnail'
import { StaggeredList, StaggerItem } from './StaggeredList'

/**
 * Shared reviews display component
 * Used by both My Corner (Reviews.jsx) and Friend View (FriendCard.jsx)
 *
 * Actions (edit/delete) are handled via onEdit/onDelete callbacks.
 * When provided, a ... overflow menu appears on each card.
 */
export const ReviewsDisplay = ({
  reviews,
  title = 'Reviews',
  emptyMessage = 'No reviews yet.',
  emptyFilteredMessage,
  onEdit,
  onDelete,
  renderHeaderActions,
  renderExpandedText
}) => {
  const [filterTag, setFilterTag] = useState('all')
  const [expandedReviews, setExpandedReviews] = useState(new Set())
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  const toggleExpanded = (reviewId) => {
    const newExpanded = new Set(expandedReviews)
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId)
    } else {
      newExpanded.add(reviewId)
    }
    setExpandedReviews(newExpanded)
  }

  // Close menu on click outside or Escape
  useEffect(() => {
    if (openMenuId === null) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openMenuId])

  const filteredReviews = filterTag === 'all'
    ? reviews
    : reviews.filter(review => review.tag === filterTag)

  const hasActions = onEdit || onDelete

  return (
    <div style={{ maxWidth: '720px', position: 'relative' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '0', marginTop: '8px', marginLeft: '10px', position: 'relative', zIndex: 1, transform: 'translateY(16px)' }}>
        {title}
      </h1>

      {/* Toolbar: filter left, header actions right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px', marginBottom: '16px' }}>
        <FilterDropdown
          value={filterTag}
          onChange={setFilterTag}
          options={[
            { value: 'all', label: 'All' },
            ...TAG_OPTIONS.map(t => ({ value: t, label: `${TAG_ICONS[t]} ${TAG_LABELS[t]}` }))
          ]}
        />
        {renderHeaderActions && renderHeaderActions()}
      </div>

      {/* Reviews list */}
      {filteredReviews.length === 0 ? (
        reviews.length === 0 ? (
          <EmptyStateFantom />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
            {emptyFilteredMessage || `No ${TAG_LABELS[filterTag] || filterTag} reviews yet.`}
          </div>
        )
      ) : (
        <StaggeredList style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredReviews.map((review, index) => (
            <StaggerItem key={review.id}>
            <div
              className="review-card"
              data-index={index}
              style={{
                background: '#FFFEFA',
                border: 'none',
                borderRadius: '2px',
                padding: '7px 16px',
                boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                zIndex: openMenuId === review.id ? 5 : 1
              }}
            >
              {/* Overflow menu button */}
              {hasActions && (
                <div ref={openMenuId === review.id ? menuRef : null} style={{ position: 'absolute', top: '6px', right: '8px', zIndex: 2 }}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === review.id ? null : review.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      fontSize: '16px',
                      color: '#A89F91',
                      lineHeight: 1,
                      letterSpacing: '1px'
                    }}
                    aria-label="Actions"
                  >
                    &middot;&middot;&middot;
                  </button>
                  {openMenuId === review.id && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      background: '#FFFEFA',
                      borderRadius: '4px',
                      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.12)',
                      padding: '4px 0',
                      minWidth: '100px',
                      zIndex: 10
                    }}>
                      {onEdit && (
                        <button
                          onClick={() => { onEdit(review); setOpenMenuId(null) }}
                          style={{
                            display: 'block',
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            padding: '8px 16px',
                            fontSize: '14px',
                            color: '#2C2C2C',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => { onDelete(review.id); setOpenMenuId(null) }}
                          style={{
                            display: 'block',
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            padding: '8px 16px',
                            fontSize: '14px',
                            color: '#C75D5D',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Review content row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: hasActions ? '24px' : 0 }}>
                <CoverThumbnail imageUrl={review.image_url} tag={review.tag} />
                <h3 style={{ margin: 0, fontSize: '14px', fontStyle: 'italic', fontWeight: 400, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {review.title}
                </h3>
                <div className="handwritten" style={{ fontSize: '18px', lineHeight: 1, color: '#2C2C2C', flexShrink: 0 }}>
                  {review.rating}/10
                </div>
              </div>

              {/* Review text: one-line preview or full expanded */}
              {review.review_text && (
                expandedReviews.has(review.id) ? (
                  <div>
                    {renderExpandedText
                      ? (renderExpandedText(review) || (
                          <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: 1.6, color: '#2C2C2C', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                            {review.review_text}
                          </div>
                        ))
                      : (
                          <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: 1.6, color: '#2C2C2C', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                            {review.review_text}
                          </div>
                        )
                    }
                    <button
                      onClick={() => toggleExpanded(review.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 0',
                        fontSize: '12px',
                        color: '#4A7BA7',
                        marginTop: '4px'
                      }}
                    >
                      Show less
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleExpanded(review.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 0',
                      marginTop: '2px',
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{
                      fontSize: '13px',
                      color: '#666',
                      fontStyle: 'italic',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0
                    }}>
                      {review.review_text}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: '#4A7BA7',
                      flexShrink: 0
                    }}>
                      Read more
                    </span>
                  </button>
                )
              )}
            </div>
            </StaggerItem>
          ))}
        </StaggeredList>
      )}
    </div>
  )
}
