import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ReviewsDisplay, TAG_ICONS } from '../components/ReviewsDisplay'

const TAG_OPTIONS = ['movie', 'book', 'podcast', 'show', 'album', 'other']

export { TAG_ICONS }

export const Reviews = () => {
  const { profile } = useAuth()
  const [reviews, setReviews] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReview, setEditingReview] = useState(null)

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
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)

      if (friendshipsError) throw friendshipsError

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

      if (reviewId && recommendToFriends.length > 0) {
        const { data: existingRecs } = await supabase
          .from('review_recommendations')
          .select('recommended_to_user_id')
          .eq('review_id', reviewId)

        const existingFriendIds = existingRecs?.map(r => r.recommended_to_user_id) || []
        const newFriendIds = recommendToFriends.filter(id => !existingFriendIds.includes(id))

        await supabase
          .from('review_recommendations')
          .delete()
          .eq('review_id', reviewId)

        const recommendations = recommendToFriends.map(friendId => ({
          review_id: reviewId,
          recommended_to_user_id: friendId
        }))

        const { error: recsError } = await supabase
          .from('review_recommendations')
          .insert(recommendations)

        if (recsError) throw recsError

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

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading reviews...</div>
      </div>
    )
  }

  return (
    <>
      <ReviewsDisplay
        reviews={reviews}
        emptyMessage="No reviews yet. Share your thoughts on movies, books, and more!"
        renderHeaderActions={() => (
          <button
            onClick={openAddModal}
            style={{
              background: '#DCDCDC',
              border: 'none',
              borderRadius: '50%',
              fontSize: '12px',
              color: '#333',
              cursor: 'pointer',
              width: '18px',
              height: '18px',
              minWidth: '18px',
              minHeight: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1
            }}
          >
            +
          </button>
        )}
        renderActions={(review) => (
          <>
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
              <span style={{ display: 'inline-block', transform: 'scale(-1.44, 1.44)', filter: 'sepia(1) saturate(8) hue-rotate(320deg) brightness(1.1) contrast(1.5)' }}>🖋️</span>
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
          </>
        )}
      />

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
    </>
  )
}
