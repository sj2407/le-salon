import { useEffect, useRef } from 'react'

/**
 * BookPopover — small card anchored near clicked book cover.
 * Shows title, author, star rating, link to full review.
 * Dismisses on click outside or Escape.
 */
export const BookPopover = ({ book, anchorRect, onClose, onViewReview }) => {
  const popoverRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    // Delay to avoid catching the click that opened the popover
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClick)
    }, 50)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('click', handleClick)
      clearTimeout(timer)
    }
  }, [onClose])

  if (!book || !anchorRect) return null

  // Position: below and centered on the anchor
  const top = anchorRect.bottom + 8
  const left = anchorRect.left + anchorRect.width / 2

  // Format rating: 0-10 scale → display as X/10
  const ratingDisplay = book.rating != null ? `${book.rating}/10` : null

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translateX(-50%)',
        background: '#FFFEFA',
        borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.18)',
        padding: '14px 16px',
        zIndex: 10000,
        maxWidth: '240px',
        minWidth: '180px',
      }}
    >
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#2C2C2C', marginBottom: '4px', lineHeight: 1.3 }}>
        {book.title}
      </div>

      {book.author && (
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
          {book.author}
        </div>
      )}

      {ratingDisplay && (
        <div style={{ fontSize: '13px', color: '#4A7BA7', marginBottom: '6px' }}>
          {'★'.repeat(Math.round(book.rating / 2))}{'☆'.repeat(5 - Math.round(book.rating / 2))} {ratingDisplay}
        </div>
      )}

      {(book.goodreads_genres || book.google_books_genres || []).length > 0 && (
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
          {(book.goodreads_genres || book.google_books_genres).slice(0, 3).join(' · ')}
        </div>
      )}

      {book.review_id && (
        <button
          onClick={() => onViewReview && onViewReview(book.review_id)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '13px',
            color: '#4A7BA7',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          View review →
        </button>
      )}

      {/* Arrow */}
      <div style={{
        position: 'absolute',
        top: '-6px',
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        width: '12px',
        height: '12px',
        background: '#FFFEFA',
        boxShadow: '-2px -2px 4px rgba(0, 0, 0, 0.05)',
      }} />
    </div>
  )
}
