import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { ReviewsDisplay } from '../components/ReviewsDisplay'
import { TAG_ICONS, TAG_OPTIONS, TAG_LABELS } from '../lib/reviewConstants'
import { TagAutocomplete } from '../components/TagAutocomplete'
import { ExpandedReviewText } from '../components/review-comments/ExpandedReviewText'
import { DictationModal } from '../components/DictationModal'
import { isSpeechSupported } from '../lib/useSpeechRecognition'
import { CoverSearchModal } from '../components/cover-search/CoverSearchModal'
import { CoverThumbnail } from '../components/cover-search/CoverThumbnail'
import { scrollLock } from '../lib/scrollLock'
import { TAG_TO_MEDIA_TYPE } from '../lib/coverSearchApis'
import { Microphone, Plus } from '@phosphor-icons/react'

export const Reviews = () => {
  const { profile } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [reviews, setReviews] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [showDictation, setShowDictation] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState('other')
  const [rating, setRating] = useState(7.0)
  const [reviewText, setReviewText] = useState('')
  const [recommendToFriends, setRecommendToFriends] = useState([])
  const [friendQuery, setFriendQuery] = useState('')
  const [error, setError] = useState('')
  const [reviewComments, setReviewComments] = useState([])
  const [imageUrl, setImageUrl] = useState('')
  const [showCoverSearch, setShowCoverSearch] = useState(false)

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
      setFriendQuery('')
      setError('')
      setImageUrl('')
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

  // Lock body scroll while modal is active (prevents iOS keyboard viewport shift)
  useEffect(() => {
    if (showModal) scrollLock.enable()
    else scrollLock.disable()
    return () => scrollLock.disable()
  }, [showModal])

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
    setFriendQuery('')
    setError('')
    setImageUrl('')
    initialFormRef.current = { title: '', tag: 'other', rating: 7.0, reviewText: '', recommendToFriends: [] }
    setShowModal(true)
  }

  const openEditModal = async (review) => {
    setEditingReview(review)
    setTitle(review.title)
    setTag(review.tag)
    setRating(review.rating)
    setReviewText(review.review_text || '')
    setImageUrl(review.image_url || '')
    setFriendQuery('')
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
            image_url: imageUrl || null,
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
            review_text: reviewText.trim() || null,
            image_url: imageUrl || null
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
      toast.success(editingReview ? 'Review updated' : 'Review saved')
    } catch (err) {
      setError(err.message)
      toast.error('Failed to save review')
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
      toast.success('Review deleted')
    } catch (_err) {
      toast.error('Failed to delete review')
    }
  }

  const handleDictationSave = async (transcript) => {
    const { data, error } = await supabase.functions.invoke('parse-dictation', {
      body: { transcript, context: 'review' }
    })
    if (error) {
      // Surface actual error from function body if available
      const detail = data?.error || error.message
      throw new Error(detail)
    }
    if (!data?.entries || data.entries.length === 0) {
      throw new Error("Couldn't identify any reviews. Try being more specific, e.g. \"I watched The Bear, 8 out of 10\".")
    }

    const rows = data.entries.map(entry => ({
      user_id: profile.id,
      title: entry.title,
      tag: TAG_OPTIONS.includes(entry.tag) ? entry.tag : 'other',
      rating: entry.rating,
      review_text: entry.review_text || null
    }))

    const { error: insertError } = await supabase.from('reviews').insert(rows)
    if (insertError) throw insertError
    await fetchReviews()
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
        title="My Reviews"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={openAddModal}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Plus size={18} weight="duotone" color="#7A3B2E" />
            </button>
            {isSpeechSupported && (
              <button
                onClick={() => setShowDictation(true)}
                title="Dictate reviews by voice"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Microphone size={14} weight="duotone" color="#7A3B2E" />
              </button>
            )}
          </div>
        )}
        onEdit={openEditModal}
        onDelete={(reviewId) => handleDelete(reviewId)}
      />

      <DictationModal
        isOpen={showDictation}
        onClose={() => setShowDictation(false)}
        mode="review"
        onSaveDirectly={handleDictationSave}
      />

      <CoverSearchModal
        isOpen={showCoverSearch}
        onClose={() => setShowCoverSearch(false)}
        onSelect={({ imageUrl: url }) => setImageUrl(url)}
        initialQuery={title}
        mediaType={TAG_TO_MEDIA_TYPE[tag]}
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
              border: 'none',
              borderRadius: '8px',
              padding: '20px 24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="handwritten" style={{ fontSize: '24px', marginBottom: '16px' }}>
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
                <TagAutocomplete value={tag} onChange={setTag} />
              </div>

              {tag !== 'other' && (
                <div className="form-group">
                  <label className="form-label">Cover Image (optional)</label>
                  {imageUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CoverThumbnail imageUrl={imageUrl} tag={tag} size="medium" />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {TAG_TO_MEDIA_TYPE[tag] && (
                          <button
                            type="button"
                            onClick={() => setShowCoverSearch(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#4A7BA7', padding: '4px 0' }}
                          >
                            Change
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#999', padding: '4px 0' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : TAG_TO_MEDIA_TYPE[tag] ? (
                    <button
                      type="button"
                      onClick={() => setShowCoverSearch(true)}
                      style={{
                        background: 'none',
                        border: '1px dashed #ccc',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#999',
                        fontStyle: 'italic',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      Search cover...
                    </button>
                  ) : (
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '13px',
                        fontStyle: 'italic',
                        boxSizing: 'border-box',
                        background: '#FFFEFA'
                      }}
                    />
                  )}
                </div>
              )}

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

                  {/* Selected friend chips */}
                  {recommendToFriends.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {recommendToFriends.map(friendId => {
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
                              onClick={() => setRecommendToFriends(recommendToFriends.filter(id => id !== friendId))}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '14px',
                                lineHeight: 1,
                                color: '#999'
                              }}
                            >
                              ×
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Autocomplete input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={friendQuery}
                      onChange={(e) => setFriendQuery(e.target.value)}
                      placeholder="Type a friend's name..."
                      autoComplete="off"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        background: '#FFFEFA',
                        fontFamily: 'Source Serif 4, Georgia, serif',
                        fontSize: '16px',
                        fontStyle: 'italic',
                        boxSizing: 'border-box'
                      }}
                    />

                    {/* Dropdown suggestions */}
                    {friendQuery.trim() && (() => {
                      const filtered = friends.filter(f =>
                        !recommendToFriends.includes(f.id) &&
                        f.display_name.toLowerCase().includes(friendQuery.toLowerCase())
                      )
                      if (filtered.length === 0) return null
                      return (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#FFFEFA',
                          border: '1px solid #ccc',
                          borderTop: 'none',
                          borderRadius: '0 0 3px 3px',
                          maxHeight: '150px',
                          overflowY: 'auto',
                          zIndex: 10
                        }}>
                          {filtered.map(friend => (
                            <div
                              key={friend.id}
                              onClick={() => {
                                setRecommendToFriends([...recommendToFriends, friend.id])
                                setFriendQuery('')
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
