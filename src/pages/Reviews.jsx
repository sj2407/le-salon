import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ReviewsDisplay } from '../components/ReviewsDisplay'
import { TAG_ICONS, TAG_OPTIONS, TAG_LABELS } from '../lib/reviewConstants'
import { ExpandedReviewText } from '../components/review-comments/ExpandedReviewText'

export const Reviews = () => {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [reviewComments, setReviewComments] = useState([])

  // Track initial form values to detect dirty state
  const initialFormRef = useRef(null)

  useEffect(() => {
    if (profile) {
      fetchReviews()
      fetchFriends()
      fetchReviewComments()
    }
  }, [profile])

  // Pre-fill add modal from URL params (e.g., from La Liste "Write a review?" link)
  useEffect(() => {
    const prefillTitle = searchParams.get('prefill_title')
    const prefillTag = searchParams.get('prefill_tag')
    if (prefillTitle) {
      setEditingReview(null)
      setTitle(prefillTitle)
      setTag(prefillTag || 'other')
      setRating(7.0)
      setReviewText('')
      setRecommendToFriends([])
      setError('')
      initialFormRef.current = { title: prefillTitle, tag: prefillTag || 'other', rating: 7.0, reviewText: '', recommendToFriends: [] }
      setShowModal(true)
      // Clear prefill params from URL
      searchParams.delete('prefill_title')
      searchParams.delete('prefill_tag')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams])

  const isFormDirty = () => {
    if (!initialFormRef.current) return false
    const init = initialFormRef.current
    return title !== init.title || tag !== init.tag ||
      parseFloat(rating) !== parseFloat(init.rating) ||
      reviewText !== init.reviewText ||
      JSON.stringify(recommendToFriends) !== JSON.stringify(init.recommendToFriends)
  }

  // Escape key handler for modal - only close if form is clean
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal && !isFormDirty()) setShowModal(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showModal, title, tag, rating, reviewText, recommendToFriends])

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
    } catch (_err) {
      // silently handled
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
    } catch (_err) {
      // silently handled
    }
  }

  const fetchReviewComments = async () => {
    try {
      const { data, error } = await supabase
        .from('review_comments')
        .select('*, from_user:profiles!review_comments_from_user_id_fkey(display_name)')
        .eq('to_user_id', profile.id)
        .order('created_at', { ascending: true })

      if (error) {
        setReviewComments([])
        return
      }
      // Flatten the join for easier use
      setReviewComments((data || []).map(c => ({
        ...c,
        commenter_name: c.from_user?.display_name || 'Friend'
      })))
    } catch (_err) {
      setReviewComments([])
    }
  }

  const handleReplyToComment = async (commentId, replyText) => {
    try {
      const comment = reviewComments.find(c => c.id === commentId)
      if (!comment) return

      const { error } = await supabase
        .from('review_comments')
        .update({ reply: replyText, replied_at: new Date().toISOString() })
        .eq('id', commentId)

      if (error) throw error

      // Notify the commenter
      const review = reviews.find(r => r.id === comment.review_id)
      await supabase.from('notifications').insert({
        user_id: comment.from_user_id,
        type: 'review_comment',
        actor_id: profile.id,
        message: `${profile.display_name} replied to your comment on ${review?.title || 'a review'}`,
        reference_id: comment.review_id,
        reference_name: 'reply'
      })

      await fetchReviewComments()
    } catch (_err) {
      // silently handled
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
    initialFormRef.current = { title: '', tag: 'other', rating: 7.0, reviewText: '', recommendToFriends: [] }
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
    } catch (_err) {
      setRecommendToFriends([])
    }

    // initialFormRef is set after recommendations load (below)
    setShowModal(true)
  }

  // Set initial form ref after recommendations finish loading for edit modal
  useEffect(() => {
    if (showModal && editingReview) {
      initialFormRef.current = {
        title, tag, rating: parseFloat(rating), reviewText,
        recommendToFriends: [...recommendToFriends]
      }
    }
  }, [showModal, editingReview?.id])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    const parsedRating = parseFloat(rating)
    if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 10) {
      setError('Rating must be between 0 and 10')
      return
    }

    try {
      let reviewId = editingReview?.id

      if (editingReview) {
        const { error } = await supabase
          .from('reviews')
          .update({
            title,
            tag,
            rating: parsedRating,
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
            rating: parsedRating,
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
        await supabase
          .from('review_recommendations')
          .delete()
          .eq('review_id', reviewId)
      }

      setShowModal(false)
      fetchReviews()
    } catch (err) {
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
    } catch (_err) {
      // silently handled
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
        renderExpandedText={(review) => {
          const commentsForReview = reviewComments.filter(c => c.review_id === review.id)
          if (commentsForReview.length === 0) return null
          return (
            <ExpandedReviewText
              review={review}
              comments={commentsForReview}
              isOwner={true}
              currentUserId={profile.id}
              ownerName={profile.display_name}
              onReplyToComment={handleReplyToComment}
            />
          )
        }}
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
              <img src="/images/quill-ready.png" alt="Edit" style={{ width: '29px', height: '29px', objectFit: 'contain' }} />
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
          onClick={() => { if (!isFormDirty()) setShowModal(false) }}
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
                  maxLength={200}
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
                      {TAG_LABELS[option]}
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
                  maxLength={5000}
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
