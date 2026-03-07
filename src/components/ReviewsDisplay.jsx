import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TAG_ICONS, TAG_OPTIONS, TAG_LABELS } from '../lib/reviewConstants'
import { EmptyStateFantom } from './EmptyStateFantom'
import { FilterDropdown } from './FilterDropdown'

const ITEMS_PER_ROW = 3

const FALLBACK_GRADIENTS = {
  book: 'linear-gradient(160deg, #7A3B2E, #622722)',
  movie: 'linear-gradient(160deg, #622722, #4A3C34)',
  show: 'linear-gradient(160deg, #622722, #3D3328)',
  album: 'linear-gradient(160deg, #827A34, #5C5428)',
  podcast: 'linear-gradient(160deg, #827A34, #4A4530)',
  performing_arts: 'linear-gradient(160deg, #8B6F4E, #6B5238)',
  exhibition: 'linear-gradient(160deg, #8B6F4E, #6B5238)',
  article: 'linear-gradient(160deg, #622722, #4A3C34)',
  other: 'linear-gradient(160deg, #622722, #4A3C34)',
}

const ACCENT_COLORS = {
  book: '#7A3B2E',
  movie: '#622722',
  show: '#622722',
  album: '#827A34',
  podcast: '#827A34',
  performing_arts: '#8B6F4E',
  exhibition: '#8B6F4E',
  article: '#622722',
  other: '#622722',
}

/**
 * Shared reviews display component — Bookshelf Gallery layout.
 * Used by both My Corner (Reviews.jsx) and Friend View (FriendCard.jsx).
 *
 * Covers are arranged in a 3-column grid with wooden shelf planks.
 * Tapping a cover with review_text opens a full-screen reader.
 * Actions (edit/delete) appear as an overflow menu on each cover.
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
  const [openMenuId, setOpenMenuId] = useState(null)
  const [openReviewId, setOpenReviewId] = useState(null)
  const menuRef = useRef(null)
  const readerScrollRef = useRef(null)
  const shelfRef = useRef(null)
  const lastOpenReviewRef = useRef(null)

  const filteredReviews = filterTag === 'all'
    ? reviews
    : reviews.filter(review => review.tag === filterTag)

  const hasActions = onEdit || onDelete

  // Chunk items into rows for shelf planks
  const rows = []
  for (let i = 0; i < filteredReviews.length; i += ITEMS_PER_ROW) {
    rows.push(filteredReviews.slice(i, i + ITEMS_PER_ROW))
  }

  // Track the open review (persists during close animation via ref)
  const openReview = reviews.find(r => r.id === openReviewId)
  if (openReview) lastOpenReviewRef.current = openReview
  const displayedReview = openReview || lastOpenReviewRef.current

  // Close overflow menu on outside click / Escape
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

  // Scroll-triggered reveal via IntersectionObserver
  useEffect(() => {
    if (!shelfRef.current) return
    const sections = shelfRef.current.querySelectorAll('.shelf-section')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    sections.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [filteredReviews])

  // Lock app scroll when reader is open
  useEffect(() => {
    if (openReviewId !== null) {
      document.body.classList.add('reader-open')
    } else {
      document.body.classList.remove('reader-open')
    }
    return () => document.body.classList.remove('reader-open')
  }, [openReviewId])

  // Escape closes reader
  useEffect(() => {
    if (openReviewId === null) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpenReviewId(null)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [openReviewId])

  // Reset reader scroll position on open
  useEffect(() => {
    if (openReviewId && readerScrollRef.current) {
      readerScrollRef.current.scrollTop = 0
    }
  }, [openReviewId])

  const handleCoverClick = (review) => {
    if (!review.review_text) return
    setOpenReviewId(review.id)
  }

  const closeReader = () => {
    setOpenReviewId(null)
  }

  // Render reader body content
  const renderReaderBody = () => {
    if (!displayedReview) return null
    const expanded = renderExpandedText
      ? renderExpandedText(displayedReview, { inReader: true })
      : null
    if (expanded) return expanded
    // Fallback: plain paragraphs with drop cap (styled via CSS)
    return (displayedReview.review_text || '').split('\n\n').filter(p => p.trim()).map((text, i) => (
      <p key={i}>{text}</p>
    ))
  }

  return (
    <div style={{ maxWidth: '720px', position: 'relative' }}>
      {/* Header */}
      <div className="bookshelf-header">
        <h1 className="handwritten" style={{ fontSize: '42px', margin: 0 }}>{title}</h1>
        <span className="bookshelf-count">
          {filteredReviews.length} {filteredReviews.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Filter + actions */}
      <div className="bookshelf-filter-row">
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

      {/* Bookshelf grid */}
      {filteredReviews.length === 0 ? (
        reviews.length === 0 ? (
          <EmptyStateFantom />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
            {emptyFilteredMessage || `No ${TAG_LABELS[filterTag] || filterTag} reviews yet.`}
          </div>
        )
      ) : (
        <div className="bookshelf" ref={shelfRef}>
          {rows.map((rowItems, rowIndex) => (
            <div className="shelf-section" key={`row-${rowIndex}-${rowItems[0]?.id}`}>
              <div className="shelf-row">
                {rowItems.map((review, itemIndex) => {
                  const hasReview = !!review.review_text
                  const isActive = openReviewId === review.id
                  const gradient = FALLBACK_GRADIENTS[review.tag] || FALLBACK_GRADIENTS.other

                  return (
                    <div
                      key={review.id}
                      id={`review-${review.id}`}
                      className={`cover-item${!hasReview ? ' score-only' : ''}${isActive ? ' active' : ''}`}
                      style={{ transitionDelay: `${itemIndex * 80}ms` }}
                      onClick={() => handleCoverClick(review)}
                    >
                      {/* Overflow menu (owner only) */}
                      {hasActions && (
                        <div
                          ref={openMenuId === review.id ? menuRef : null}
                          className="cover-menu-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="cover-menu-btn"
                            onClick={() => setOpenMenuId(openMenuId === review.id ? null : review.id)}
                            aria-label="Actions"
                          >
                            &middot;&middot;&middot;
                          </button>
                          {openMenuId === review.id && (
                            <div className="cover-menu-dropdown">
                              {onEdit && (
                                <button onClick={() => { onEdit(review); setOpenMenuId(null) }}>
                                  Edit
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => { onDelete(review.id); setOpenMenuId(null) }}
                                  style={{ color: '#C75D5D' }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cover image / fallback */}
                      <div className="cover-image-wrap">
                        <div className="cover-fallback" style={{ background: gradient }}>
                          <span className="fallback-type">{TAG_LABELS[review.tag] || review.tag}</span>
                          <div className="fallback-title">{review.title}</div>
                        </div>
                        {review.image_url && (
                          <img
                            className="cover-img"
                            src={review.image_url}
                            alt={review.title}
                            loading="lazy"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        )}
                      </div>
                      <div className="cover-rating">
                        <span>{review.rating}</span>
                      </div>

                      {/* Title + review indicator */}
                      <div className="cover-title-row">
                        <span>{review.title}</span>
                        {hasReview && (
                          <span className="review-indicator">
                            <span className="ri-label">read</span>
                            <span className="ri-arrow">&#9656;</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="shelf-plank" />
            </div>
          ))}
        </div>
      )}

      {/* Full-screen review reader (portal to body) */}
      {createPortal(
        <div className={`review-reader${openReviewId !== null ? ' open' : ''}`}>
          <div
            className="reader-accent"
            style={{ background: displayedReview ? (ACCENT_COLORS[displayedReview.tag] || ACCENT_COLORS.other) : '#7A3B2E' }}
          />
          <div className="reader-topbar">
            <button className="reader-back" onClick={closeReader}>
              <span className="reader-back-arrow">&larr;</span> back
            </button>
          </div>
          <div className="reader-scroll" ref={readerScrollRef}>
            {displayedReview && (
              <>
                <div className="reader-header">
                  <div className="reader-cover">
                    {displayedReview.image_url ? (
                      <img src={displayedReview.image_url} alt={displayedReview.title} />
                    ) : (
                      <div
                        className="reader-cover-fallback"
                        style={{ background: FALLBACK_GRADIENTS[displayedReview.tag] || FALLBACK_GRADIENTS.other }}
                      >
                        {displayedReview.title}
                      </div>
                    )}
                  </div>
                  <div className="reader-info">
                    <div className="reader-title">{displayedReview.title}</div>
                    <div className="reader-meta">
                      {TAG_ICONS[displayedReview.tag]} {TAG_LABELS[displayedReview.tag] || displayedReview.tag}
                    </div>
                    <div className="reader-rating">
                      {displayedReview.rating}<span className="reader-rating-label">/10</span>
                    </div>
                  </div>
                </div>
                <div className="reader-divider" />
                <div className="reader-body">
                  {renderReaderBody()}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
