import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const TAG_ICONS = {
  movie: '🎬',
  book: '📖',
  podcast: '🎧',
  show: '📺',
  album: '💿',
  other: '✨'
}

const TAG_OPTIONS = ['movie', 'book', 'podcast', 'show', 'album', 'other']

export const Reviews = () => {
  const { profile } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [expandedReviews, setExpandedReviews] = useState(new Set())
  const [filterTag, setFilterTag] = useState('all')

  // Form state
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState('other')
  const [rating, setRating] = useState(7.0)
  const [reviewText, setReviewText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      fetchReviews()
    }
  }, [profile])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReviews(data || [])
    } catch (err) {
      console.error('Error fetching reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingReview(null)
    setTitle('')
    setTag('other')
    setRating(7.0)
    setReviewText('')
    setError('')
    setShowModal(true)
  }

  const openEditModal = (review) => {
    setEditingReview(review)
    setTitle(review.title)
    setTag(review.tag)
    setRating(review.rating)
    setReviewText(review.review_text || '')
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            title,
            tag,
            rating: parseFloat(rating),
            review_text: reviewText.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingReview.id)

        if (error) throw error
      } else {
        // Create new review
        const { error } = await supabase
          .from('reviews')
          .insert({
            user_id: profile.id,
            title,
            tag,
            rating: parseFloat(rating),
            review_text: reviewText.trim() || null
          })

        if (error) throw error
      }

      setShowModal(false)
      fetchReviews()
    } catch (err) {
      console.error('Error saving review:', err)
      setError(err.message)
    }
  }

  const handleDelete = async (reviewId) => {
    if (!confirm('Delete this review?')) return

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)

      if (error) throw error
      fetchReviews()
    } catch (err) {
      console.error('Error deleting review:', err)
    }
  }

  const toggleExpanded = (reviewId) => {
    const newExpanded = new Set(expandedReviews)
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId)
    } else {
      newExpanded.add(reviewId)
    }
    setExpandedReviews(newExpanded)
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading reviews...</div>
      </div>
    )
  }

  const filteredReviews = filterTag === 'all'
    ? reviews
    : reviews.filter(review => review.tag === filterTag)

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="handwritten" style={{ fontSize: '42px', margin: 0 }}>
          Reviews
        </h1>
        <button onClick={openAddModal} className="primary">
          Add Review
        </button>
      </div>

      {/* Filter tags */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterTag('all')}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            background: filterTag === 'all' ? '#2C2C2C' : '#FFFEFA',
            color: filterTag === 'all' ? '#FFFEFA' : '#2C2C2C',
            border: '1.5px solid #2C2C2C',
            borderRadius: '16px',
            cursor: 'pointer',
            fontWeight: filterTag === 'all' ? 600 : 400,
            transition: 'all 0.2s'
          }}
        >
          All
        </button>
        {TAG_OPTIONS.map((tagOption) => (
          <button
            key={tagOption}
            onClick={() => setFilterTag(tagOption)}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              background: filterTag === tagOption ? '#2C2C2C' : '#FFFEFA',
              color: filterTag === tagOption ? '#FFFEFA' : '#2C2C2C',
              border: '1.5px solid #2C2C2C',
              borderRadius: '16px',
              cursor: 'pointer',
              fontWeight: filterTag === tagOption ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            {TAG_ICONS[tagOption]} {tagOption}
          </button>
        ))}
      </div>

      {filteredReviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          {reviews.length === 0
            ? 'No reviews yet. Share your thoughts on movies, books, and more!'
            : `No ${filterTag} reviews yet.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              style={{
                background: '#FFFEFA',
                border: '1px solid #D0D0D0',
                borderRadius: '4px',
                padding: '14px 16px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)'
              }}
            >
              {/* Single line: Icon + Title + Rating + Expand + Edit/Delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{TAG_ICONS[review.tag]}</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {review.title}
                </h3>
                <div className="handwritten" style={{ fontSize: '28px', lineHeight: 1, color: '#2C2C2C', flexShrink: 0 }}>
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
                <button
                  onClick={() => openEditModal(review)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '16px',
                    opacity: 0.4,
                    transition: 'opacity 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.4'}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(review.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '16px',
                    opacity: 0.4,
                    transition: 'opacity 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.4'}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>

              {/* Expanded review text appears below */}
              {review.review_text && expandedReviews.has(review.id) && (
                <div style={{ marginTop: '12px', fontSize: '14px', lineHeight: 1.6, color: '#2C2C2C', fontStyle: 'italic' }}>
                  {review.review_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#FFFEFA',
              border: '2px solid #2C2C2C',
              borderRadius: '4px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '4px 4px 0 #2C2C2C'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '24px' }}>
              {editingReview ? 'Edit Review' : 'Add Review'}
            </h2>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Avatar: The Way of Water"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tag *</label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    background: '#FFFEFA',
                    fontSize: '15px',
                    fontFamily: 'Source Serif 4, Georgia, serif'
                  }}
                >
                  {TAG_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Rating (0-10) *</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Review (optional)</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your thoughts..."
                  style={{ minHeight: '120px' }}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="primary" style={{ flex: 1 }}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
