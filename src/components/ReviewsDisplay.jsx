import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { TAG_ICONS, TAG_OPTIONS, TAG_LABELS } from '../lib/reviewConstants'
import { TAG_TO_MEDIA_TYPE } from '../lib/coverSearchApis'
import { EmptyStateFantom } from './EmptyStateFantom'
import { FilterDropdown } from './FilterDropdown'
import { TagAutocomplete } from './TagAutocomplete'
import { useOutsideClick } from '../hooks/useOutsideClick'
import { ConfirmModal } from './ConfirmModal'

const ITEMS_PER_ROW = 3

const FALLBACK_GRADIENTS = {
  book: 'linear-gradient(160deg, #622722, #622722)',
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
  book: '#622722',
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
  onSaveEdit,
  onOpenCoverSearch,
  editCoverUrl,
  friends,
  renderHeaderActions,
  renderExpandedText,
  initialReviewId,
  renderNotesSection,
  reviewHasContent,
  getReaderLabel
}) => {
  const [filterTag, setFilterTag] = useState('all')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [openReviewId, setOpenReviewId] = useState(initialReviewId || null)
  const menuRef = useRef(null)
  const readerScrollRef = useRef(null)
  const shelfRef = useRef(null)
  const lastOpenReviewRef = useRef(null)

  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editTag, setEditTag] = useState('other')
  const [editRating, setEditRating] = useState(7.0)
  const [editReviewText, setEditReviewText] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editRecommendToFriends, setEditRecommendToFriends] = useState([])
  const [editFriendQuery, setEditFriendQuery] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const editInitialRef = useRef(null)
  const editTextareaRef = useRef(null)

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

  useOutsideClick(menuRef, () => setOpenMenuId(null), openMenuId !== null)

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

  // Escape closes reader (or exits edit mode with dirty check)
  useEffect(() => {
    if (openReviewId === null) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (editMode) {
          cancelEditMode()
        } else {
          setOpenReviewId(null)
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [openReviewId, editMode, editTitle, editTag, editRating, editReviewText, editImageUrl, editRecommendToFriends])

  // Reset reader scroll position on open
  useEffect(() => {
    if (openReviewId && readerScrollRef.current) {
      readerScrollRef.current.scrollTop = 0
    }
  }, [openReviewId])

  const handleCoverClick = (review) => {
    const hasContent = reviewHasContent ? reviewHasContent(review) : !!review.review_text
    if (!hasContent) return
    setOpenReviewId(review.id)
  }

  const closeReader = () => {
    setEditMode(false)
    setOpenReviewId(null)
  }

  // Enter edit mode for a review (called from ... menu)
  const enterEditMode = useCallback((review, initialRecs) => {
    setEditTitle(review.title)
    setEditTag(review.tag)
    setEditRating(review.rating)
    setEditReviewText(review.review_text || '')
    setEditImageUrl(review.image_url || '')
    setEditRecommendToFriends(initialRecs || [])
    setEditFriendQuery('')
    setEditSaving(false)
    editInitialRef.current = {
      title: review.title,
      tag: review.tag,
      rating: parseFloat(review.rating),
      reviewText: review.review_text || '',
      imageUrl: review.image_url || '',
      recommendToFriends: [...(initialRecs || [])]
    }
    setOpenReviewId(review.id)
    setEditMode(true)
  }, [])

  const isEditDirty = () => {
    if (!editInitialRef.current) return false
    const init = editInitialRef.current
    return editTitle !== init.title || editTag !== init.tag ||
      parseFloat(editRating) !== init.rating ||
      editReviewText !== init.reviewText ||
      editImageUrl !== init.imageUrl ||
      JSON.stringify(editRecommendToFriends) !== JSON.stringify(init.recommendToFriends)
  }

  const cancelEditMode = () => {
    if (isEditDirty()) {
      setConfirmState({
        message: 'Discard unsaved changes?',
        confirmText: 'Discard',
        destructive: false,
        onConfirm: async () => {
          setEditMode(false)
          setOpenReviewId(null)
        },
      })
      return
    }
    setEditMode(false)
    setOpenReviewId(null)
  }

  const handleEditSave = async () => {
    if (!displayedReview || !onSaveEdit) return
    setEditSaving(true)
    try {
      await onSaveEdit(displayedReview.id, {
        title: editTitle,
        tag: editTag,
        rating: parseFloat(editRating),
        reviewText: editReviewText,
        imageUrl: editImageUrl,
        recommendToFriends: editRecommendToFriends
      })
      setEditMode(false)
    } catch (_err) {
      // error handled by parent
    } finally {
      setEditSaving(false)
    }
  }

  // Sync cover URL from parent (CoverSearchModal lives in Reviews.jsx)
  useEffect(() => {
    if (editMode && editCoverUrl !== undefined && editCoverUrl !== null) {
      setEditImageUrl(editCoverUrl)
    }
  }, [editCoverUrl])

  // Auto-resize textarea
  useEffect(() => {
    if (editMode && editTextareaRef.current) {
      const ta = editTextareaRef.current
      ta.style.height = 'auto'
      ta.style.height = ta.scrollHeight + 'px'
    }
  }, [editMode, editReviewText])

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
                  const hasReview = reviewHasContent ? reviewHasContent(review) : !!review.review_text
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
                                <button onClick={() => { onEdit(review, enterEditMode); setOpenMenuId(null) }}>
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
                            <span className="ri-label">{getReaderLabel ? getReaderLabel(review) : 'read'}</span>
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
            style={{ background: displayedReview ? (ACCENT_COLORS[editMode ? editTag : displayedReview?.tag] || ACCENT_COLORS.other) : '#622722' }}
          />
          <div className="reader-topbar" style={editMode ? { justifyContent: 'space-between' } : undefined}>
            {editMode ? (
              <>
                <button className="reader-back" onClick={cancelEditMode}>
                  Cancel
                </button>
                <button
                  className="reader-back"
                  onClick={handleEditSave}
                  disabled={editSaving || !editTitle.trim()}
                  style={{ color: '#622722', fontWeight: 600, fontStyle: 'normal', opacity: editSaving || !editTitle.trim() ? 0.5 : 1 }}
                >
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button className="reader-back" onClick={closeReader}>
                <span className="reader-back-arrow">&larr;</span> back
              </button>
            )}
          </div>
          <div className="reader-scroll" ref={readerScrollRef}>
            {displayedReview && (
              <>
                <div className="reader-header">
                  {/* Cover */}
                  <div className="reader-cover" style={{ position: 'relative' }}>
                    {editMode ? (
                      <>
                        {editImageUrl ? (
                          <img src={editImageUrl} alt={editTitle} />
                        ) : (
                          <div
                            className="reader-cover-fallback"
                            style={{ background: FALLBACK_GRADIENTS[editTag] || FALLBACK_GRADIENTS.other }}
                          >
                            {editTitle}
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: '-24px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          {TAG_TO_MEDIA_TYPE[editTag] && onOpenCoverSearch && (
                            <button
                              type="button"
                              onClick={() => onOpenCoverSearch(editTitle, editTag)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#4A7BA7', padding: 0 }}
                            >
                              {editImageUrl ? 'Change' : 'Search'}
                            </button>
                          )}
                          {editImageUrl && (
                            <button
                              type="button"
                              onClick={() => setEditImageUrl('')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#999', padding: 0 }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      displayedReview.image_url ? (
                        <img src={displayedReview.image_url} alt={displayedReview.title} />
                      ) : (
                        <div
                          className="reader-cover-fallback"
                          style={{ background: FALLBACK_GRADIENTS[displayedReview.tag] || FALLBACK_GRADIENTS.other }}
                        >
                          {displayedReview.title}
                        </div>
                      )
                    )}
                  </div>

                  {/* Info */}
                  <div className="reader-info">
                    {editMode ? (
                      <>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          maxLength={200}
                          className="reader-edit-title"
                          placeholder="Title"
                        />
                        <div style={{ marginBottom: '10px' }}>
                          <TagAutocomplete
                            value={editTag}
                            onChange={setEditTag}
                            style={{ maxWidth: '180px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={editRating}
                            onChange={(e) => setEditRating(e.target.value)}
                            className="reader-edit-rating"
                          />
                          <span className="reader-rating-label">/10</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="reader-title">{displayedReview.title}</div>
                        <div className="reader-meta">
                          {TAG_ICONS[displayedReview.tag]} {TAG_LABELS[displayedReview.tag] || displayedReview.tag}
                        </div>
                        <div className="reader-rating">
                          {displayedReview.rating}<span className="reader-rating-label">/10</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="reader-divider" />

                {/* Body: edit textarea or read-only text */}
                {editMode ? (
                  <div className="reader-body">
                    <textarea
                      ref={editTextareaRef}
                      value={editReviewText}
                      onChange={(e) => setEditReviewText(e.target.value)}
                      maxLength={5000}
                      placeholder="Share your thoughts..."
                      className="reader-edit-textarea"
                    />

                    {/* Who would love this? */}
                    {friends && friends.length > 0 && (
                      <div style={{ marginTop: '32px' }}>
                        <label style={{ fontSize: '14px', color: '#777', fontStyle: 'italic', display: 'block', marginBottom: '8px' }}>
                          Who would love this?
                        </label>

                        {editRecommendToFriends.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                            {editRecommendToFriends.map(friendId => {
                              const friend = friends.find(f => f.id === friendId)
                              if (!friend) return null
                              return (
                                <span
                                  key={friendId}
                                  style={{
                                    background: '#F5F0EB',
                                    borderRadius: '12px',
                                    padding: '4px 10px',
                                    fontSize: '13px',
                                    fontFamily: 'Source Serif 4, Georgia, serif',
                                    fontStyle: 'italic',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  {friend.display_name}
                                  <button
                                    type="button"
                                    onClick={() => setEditRecommendToFriends(editRecommendToFriends.filter(id => id !== friendId))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1, color: '#999' }}
                                  >
                                    &times;
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        )}

                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            value={editFriendQuery}
                            onChange={(e) => setEditFriendQuery(e.target.value)}
                            placeholder="Type a friend's name..."
                            autoComplete="off"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1px solid #D9CBAD',
                              borderRadius: '3px',
                              background: '#FFFEFA',
                              fontFamily: 'Source Serif 4, Georgia, serif',
                              fontSize: '15px',
                              fontStyle: 'italic',
                              boxSizing: 'border-box'
                            }}
                          />
                          {editFriendQuery.trim() && (() => {
                            const filtered = friends.filter(f =>
                              !editRecommendToFriends.includes(f.id) &&
                              f.display_name.toLowerCase().includes(editFriendQuery.toLowerCase())
                            )
                            if (filtered.length === 0) return null
                            return (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: '#FFFEFA',
                                borderRadius: '0 0 3px 3px',
                                boxShadow: '2px 3px 12px rgba(0,0,0,0.15)',
                                maxHeight: '150px',
                                overflowY: 'auto',
                                zIndex: 10
                              }}>
                                {filtered.map(friend => (
                                  <div
                                    key={friend.id}
                                    onClick={() => {
                                      setEditRecommendToFriends([...editRecommendToFriends, friend.id])
                                      setEditFriendQuery('')
                                    }}
                                    style={{
                                      padding: '8px 10px',
                                      cursor: 'pointer',
                                      fontFamily: 'Source Serif 4, Georgia, serif',
                                      fontSize: '15px',
                                      fontStyle: 'italic',
                                      transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#F5F0EB'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    {friend.display_name}
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="reader-body">
                    {renderReaderBody()}
                  </div>
                )}
                {renderNotesSection && renderNotesSection(displayedReview)}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => { await confirmState?.onConfirm(); setConfirmState(null) }}
        title="Confirm"
        message={confirmState?.message || ''}
        confirmText={confirmState?.confirmText || 'Discard'}
        destructive={confirmState?.destructive ?? false}
      />
    </div>
  )
}
