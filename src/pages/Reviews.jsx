import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const TAG_ICONS = {
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
  const [friends, setFriends] = useState([])
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
  const [recommendToFriends, setRecommendToFriends] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      fetchReviews()
      fetchFriends()
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

  const fetchFriends = async () => {
    try {
      // Get accepted friendships
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)

      if (friendshipsError) throw friendshipsError

      // Get friend IDs
      const friendIds = friendshipsData.map(f =>
        f.requester_id === profile.id ? f.recipient_id : f.requester_id
      )

      if (friendIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', friendIds)

        if (profilesError) throw profilesError
        setFriends(profilesData || [])
      }
    } catch (err) {
      console.error('Error fetching friends:', err)
    }
  }

  const openAddModal = () => {
    setEditingReview(null)
    setTitle('')
    setTag('other')
    setRating(7.0)
    setReviewText('')
    setRecommendToFriends([])
    setError('')
    setShowModal(true)
  }

  const openEditModal = async (review) => {
    setEditingReview(review)
    setTitle(review.title)
    setTag(review.tag)
    setRating(review.rating)
    setReviewText(review.review_text || '')
    setError('')

    // Load existing recommendations for this review
    try {
      const { data, error } = await supabase
        .from('review_recommendations')
        .select('recommended_to_user_id')
        .eq('review_id', review.id)

      if (error) throw error
      setRecommendToFriends(data?.map(r => r.recommended_to_user_id) || [])
    } catch (err) {
      console.error('Error loading recommendations:', err)
      setRecommendToFriends([])
    }

    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    try {
      let reviewId = editingReview?.id

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
        const { data, error } = await supabase
          .from('reviews')
          .insert({
            user_id: profile.id,
            title,
            tag,
            rating: parseFloat(rating),
            review_text: reviewText.trim() || null
          })
          .select()
          .single()

        if (error) throw error
        reviewId = data.id
      }

      // Save recommendations
      if (reviewId && recommendToFriends.length > 0) {
        // Get existing recommendations to determine which are new
        const { data: existingRecs } = await supabase
          .from('review_recommendations')
          .select('recommended_to_user_id')
          .eq('review_id', reviewId)

        const existingFriendIds = existingRecs?.map(r => r.recommended_to_user_id) || []
        const newFriendIds = recommendToFriends.filter(id => !existingFriendIds.includes(id))

        // Delete existing recommendations
        await supabase
          .from('review_recommendations')
          .delete()
          .eq('review_id', reviewId)

        // Insert new recommendations
        const recommendations = recommendToFriends.map(friendId => ({
          review_id: reviewId,
          recommended_to_user_id: friendId
        }))

        const { error: recsError } = await supabase
          .from('review_recommendations')
          .insert(recommendations)

        if (recsError) throw recsError

        // Create notifications for NEW recommendations only
        for (const friendId of newFriendIds) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: friendId,
              type: 'recommendation',
              actor_id: profile.id,
              reference_id: reviewId,
              reference_name: title,
              message: `${profile.display_name} recommended ${title}`
            })

          if (notifError) {
            console.error('Notification insert failed:', notifError)
          }
        }
      } else if (reviewId) {
        // Clear all recommendations if none selected
        await supabase
          .from('review_recommendations')
          .delete()
          .eq('review_id', reviewId)
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
    <div className="container" style={{ maxWidth: '720px', position: 'relative' }}>
      {/* Collage element - gavel peeking from corner */}
      <img
        src="/images/gavel-ready.png"
        alt=""
        style={{
          position: 'absolute',
          top: '8px',
          right: '15%',
          width: '90px',
          height: '90px',
          opacity: 0.3,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'gavelSway 5s ease-in-out infinite',
          filter: 'contrast(2.5) brightness(1.35)'
        }}
      />

      {/* Add Review button and Filter dropdown */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', marginTop: '4px', flexWrap: 'wrap', gap: '12px' }}>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                background: '#FFFEFA',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '12px'
              }}
            >
              <option value="all">All</option>
              {TAG_OPTIONS.map((tagOption) => (
                <option key={tagOption} value={tagOption}>
                  {TAG_ICONS[tagOption]} {tagOption}
                </option>
              ))}
            </select>
            <button onClick={openAddModal} style={{ background: '#DCDCDC', border: 'none', borderRadius: '50%', fontSize: '12px', color: '#333', cursor: 'pointer', width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginTop: '48px', lineHeight: 1 }}>
              +
            </button>
          </div>

      {filteredReviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          {reviews.length === 0
            ? 'No reviews yet. Share your thoughts on movies, books, and more!'
            : `No ${filterTag} reviews yet.`}
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
                boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Single line: Icon + Title + Rating + Expand + Edit/Delete */}
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
                  <span style={{ display: 'inline-block', transform: 'scale(-1.2, 1.2)' }}>🖋️</span>
                </button>
                <button
                  onClick={() => handleDelete(review.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: 0.6,
                    transition: 'opacity 0.2s',
                    flexShrink: 0,
                    fontSize: '18px'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.6'}
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
                    fontFamily: 'Source Serif 4, Georgia, serif',
                    fontSize: '15px',
                    fontStyle: 'italic'
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

              {friends.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Who would love this? (optional)</label>
                  <div>
                    {friends.map(friend => (
                      <div key={friend.id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                        <label
                          htmlFor={`friend-${friend.id}`}
                          style={{
                            fontFamily: 'Source Serif 4, Georgia, serif',
                            fontSize: '15px',
                            fontStyle: 'italic',
                            cursor: 'pointer',
                            margin: 0,
                            marginRight: '8px'
                          }}
                        >
                          {friend.display_name}
                        </label>
                        <input
                          type="checkbox"
                          id={`friend-${friend.id}`}
                          checked={recommendToFriends.includes(friend.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRecommendToFriends([...recommendToFriends, friend.id])
                            } else {
                              setRecommendToFriends(recommendToFriends.filter(id => id !== friend.id))
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
