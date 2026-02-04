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
  const [recommendations, setRecommendations] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [expandedReviews, setExpandedReviews] = useState(new Set())
  const [filterTag, setFilterTag] = useState('all')
  const [activeTab, setActiveTab] = useState('myReviews')

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
      fetchRecommendations()
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

  const fetchRecommendations = async () => {
    try {
      const { data: recsData, error: recsError } = await supabase
        .from('review_recommendations')
        .select('review_id')
        .eq('recommended_to_user_id', profile.id)

      if (recsError) throw recsError

      if (!recsData || recsData.length === 0) {
        setRecommendations([])
        return
      }

      const reviewIds = recsData.map(r => r.review_id)

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!reviews_user_id_fkey(display_name, username)
        `)
        .in('id', reviewIds)
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError

      setRecommendations(reviewsData || [])
    } catch (err) {
      console.error('Error fetching recommendations:', err)
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
          await supabase
            .from('notifications')
            .insert({
              user_id: friendId,
              type: 'recommendation',
              actor_id: profile.id,
              reference_id: reviewId,
              reference_name: title,
              message: `${profile.display_name} recommended ${title}`
            })
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
          top: '15px',
          left: '180px',
          width: '70px',
          height: '70px',
          opacity: 0.4,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'bookFloat 4.5s ease-in-out infinite',
          filter: 'contrast(2.5) brightness(1.35)'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        <h1 className="handwritten" style={{ fontSize: '42px', margin: 0 }}>
          Reviews
        </h1>
        <button onClick={openAddModal} style={{ background: 'none', border: 'none', fontFamily: 'Caveat, cursive', fontSize: '20px', color: '#4A7BA7', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
          + Add Review
        </button>
      </div>

      {/* Tab buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('myReviews')}
          className="tab-button"
          data-active={activeTab === 'myReviews'}
          style={{
            padding: '8px 20px',
            fontSize: '14px',
            fontFamily: 'Caveat, cursive',
            fontSize: '20px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#2C2C2C',
            transition: 'all 250ms ease-out'
          }}
        >
          My Reviews
        </button>
        <button
          onClick={() => setActiveTab('recs')}
          className="tab-button"
          data-active={activeTab === 'recs'}
          style={{
            padding: '8px 20px',
            fontSize: '20px',
            fontFamily: 'Caveat, cursive',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#2C2C2C',
            transition: 'all 250ms ease-out',
            position: 'relative'
          }}
        >
          Recs from Friends
          {recommendations.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              background: '#E8534F',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 600
            }}>
              {recommendations.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'myReviews' ? (
        <>
          {/* Filter tags */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterTag('all')}
          className="filter-pill"
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            background: filterTag === 'all' ? '#2C2C2C' : '#FFFEFA',
            color: filterTag === 'all' ? '#FFFEFA' : '#2C2C2C',
            fontWeight: filterTag === 'all' ? 600 : 400
          }}
        >
          All
        </button>
        {TAG_OPTIONS.map((tagOption) => (
          <button
            key={tagOption}
            onClick={() => setFilterTag(tagOption)}
            className="filter-pill"
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              background: filterTag === tagOption ? '#2C2C2C' : '#FFFEFA',
              color: filterTag === tagOption ? '#FFFEFA' : '#2C2C2C',
              fontWeight: filterTag === tagOption ? 600 : 400
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
          {filteredReviews.map((review, index) => (
            <div
              key={review.id}
              className="review-card"
              data-index={index}
              style={{
                background: '#FFFEFA',
                border: 'none',
                borderRadius: '2px',
                padding: '14px 16px',
                boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
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
                    opacity: 0.6,
                    transition: 'opacity 0.2s',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.6'}
                  title="Delete"
                >
                  <img
                    src="/images/eraser.jpeg"
                    alt="Delete"
                    style={{
                      width: '24px',
                      height: '24px',
                      objectFit: 'contain'
                    }}
                  />
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
        </>
      ) : (
        <>
          {/* Recommendations from Friends */}
          {recommendations.length === 0 ? (
            <div style={{
              background: '#FFFEFA',
              border: 'none',
              borderRadius: '2px',
              padding: '48px 32px',
              textAlign: 'center',
              boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
                No recommendations yet. When friends recommend reviews to you, they'll appear here!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recommendations.map((review, index) => (
                <div
                  key={review.id}
                  className="review-card"
                  data-index={index}
                  style={{
                    background: '#FFFEFA',
                    border: 'none',
                    borderRadius: '2px',
                    padding: '20px 24px',
                    position: 'relative',
                    boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                    Recommended by {review.profiles?.display_name || 'a friend'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{TAG_ICONS[review.tag] || '📌'}</span>
                    <h3 style={{ fontSize: '18px', margin: 0, flex: 1 }}>{review.title}</h3>
                    <span className="handwritten" style={{ fontSize: '24px', fontWeight: 600 }}>
                      {review.rating}/10
                    </span>
                  </div>

                  {review.review_text && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        margin: 0,
                        whiteSpace: expandedReviews.has(review.id) ? 'pre-wrap' : 'nowrap',
                        overflow: expandedReviews.has(review.id) ? 'visible' : 'hidden',
                        textOverflow: expandedReviews.has(review.id) ? 'clip' : 'ellipsis'
                      }}>
                        {review.review_text}
                      </p>
                      <button
                        onClick={() => toggleExpanded(review.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2C2C2C',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: '4px 0',
                          marginTop: '4px',
                          textDecoration: 'underline'
                        }}
                      >
                        {expandedReviews.has(review.id) ? 'Show less' : 'Read more'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
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
