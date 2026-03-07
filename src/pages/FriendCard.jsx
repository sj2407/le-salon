import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CardDisplay } from '../components/CardDisplay'
import { FriendWishlist } from '../components/FriendWishlist'
import { FriendListe } from '../components/FriendListe'
import { ReviewsDisplay } from '../components/ReviewsDisplay'
import { TAG_ICONS } from '../lib/reviewConstants'
import { ExpandedReviewText } from '../components/review-comments/ExpandedReviewText'
import { GearSix } from '@phosphor-icons/react'
import { Portrait } from './Portrait'

const FRIEND_TABS = ['card', 'reviews', 'liste', 'wishlist', 'portrait']

export const FriendCard = () => {
  const { friendId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [friendProfile, setFriendProfile] = useState(null)
  const [card, setCard] = useState(null)
  const [entries, setEntries] = useState([])
  const [reviews, setReviews] = useState([])
  const [myNotes, setMyNotes] = useState([])
  const [reviewComments, setReviewComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('card')
  const [showProfile, setShowProfile] = useState(false)
  const profileBackdropRef = useRef(null)

  // Escape key to close profile popup
  useEffect(() => {
    if (!showProfile) return
    const handleEscape = (e) => { if (e.key === 'Escape') setShowProfile(false) }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showProfile])

  const [cardOverlaps, setCardOverlaps] = useState([])
  const [reviewOverlaps, setReviewOverlaps] = useState([])
  const [activityOverlaps, setActivityOverlaps] = useState([])

  useEffect(() => {
    if (profile && friendId) {
      fetchFriendCard()
      fetchOverlaps()
    }
  }, [profile, friendId])

  const fetchFriendCard = async () => {
    try {
      setLoading(true)

      // Fetch friendship check AND all data in one parallel batch
      const [friendshipResult, profileResult, cardResult, reviewsResult, commentsResult] = await Promise.all([
        supabase.from('friendships').select('id').eq('status', 'accepted')
          .or(`and(requester_id.eq.${profile.id},recipient_id.eq.${friendId}),and(requester_id.eq.${friendId},recipient_id.eq.${profile.id})`)
          .single(),
        supabase.from('profiles').select('*').eq('id', friendId).single(),
        supabase.from('cards').select('*').eq('user_id', friendId).eq('is_current', true).single(),
        supabase.from('reviews').select('*').eq('user_id', friendId).order('created_at', { ascending: false }),
        supabase.from('review_comments').select('*').eq('from_user_id', profile.id).eq('to_user_id', friendId)
      ])

      // Check friendship before using data
      if (friendshipResult.error || !friendshipResult.data) {
        setError('You are not friends with this user')
        return
      }

      // Handle profile
      if (profileResult.error) throw profileResult.error
      setFriendProfile(profileResult.data)

      // Handle reviews
      if (reviewsResult.error) throw reviewsResult.error
      setReviews(reviewsResult.data || [])

      // Handle review comments
      if (commentsResult.error) {
        setReviewComments([])
      } else {
        setReviewComments(commentsResult.data || [])
      }

      // Handle card
      const cardData = cardResult.data
      if (cardResult.error && cardResult.error.code !== 'PGRST116') {
        throw cardResult.error
      }

      if (cardData) {
        setCard(cardData)

        // Step 3: Fetch entries and notes in parallel (both depend on card ID)
        const [entriesResult, notesResult] = await Promise.all([
          supabase.from('entries').select('*').eq('card_id', cardData.id).order('display_order'),
          supabase.from('card_notes').select('*').eq('card_id', cardData.id).eq('from_user_id', profile.id)
        ])

        if (entriesResult.error) throw entriesResult.error
        setEntries(entriesResult.data || [])

        if (notesResult.error) {
          setMyNotes([])
        } else {
          setMyNotes(notesResult.data || [])
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyNotes = async (cardId) => {
    try {
      const { data, error } = await supabase
        .from('card_notes')
        .select('*')
        .eq('card_id', cardId)
        .eq('from_user_id', profile.id)

      if (error) {
        setMyNotes([])
        return
      }

      setMyNotes(data || [])
    } catch (_err) {
      setMyNotes([])
    }
  }

  const handleLeaveNote = async (sectionName, content) => {
    if (!card || !friendProfile) return

    try {
      const { error } = await supabase
        .from('card_notes')
        .insert({
          card_id: card.id,
          card_section: sectionName,
          from_user_id: profile.id,
          to_user_id: friendProfile.id,
          content
        })

      if (error) {
        alert('Could not save note. Please try again.')
        return
      }

      // Create notification for the friend
      await supabase.from('notifications').insert({
        user_id: friendProfile.id,
        type: 'card_note',
        actor_id: profile.id,
        message: `${profile.display_name} left you a note`,
        reference_id: card.id
      })

      // Refresh notes
      await fetchMyNotes(card.id)
    } catch (_err) {
      alert('Could not save note. Please try again.')
    }
  }

  const handleUpdateNote = async (noteId, content) => {
    try {
      const { error } = await supabase
        .from('card_notes')
        .update({
          content,
          updated_at: new Date().toISOString(),
          is_read: false,
          read_at: null
        })
        .eq('id', noteId)
        .eq('from_user_id', profile.id)

      if (error) throw error

      // Create notification for the update
      if (friendProfile) {
        await supabase.from('notifications').insert({
          user_id: friendProfile.id,
          type: 'card_note',
          actor_id: profile.id,
          message: `${profile.display_name} updated their note`,
          reference_id: card?.id
        })
      }

      // Refresh notes
      if (card) {
        await fetchMyNotes(card.id)
      }
    } catch (_err) {
      // silently handled
    }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      const { error } = await supabase
        .from('card_notes')
        .delete()
        .eq('id', noteId)
        .eq('from_user_id', profile.id)

      if (error) throw error

      // Refresh notes
      if (card) {
        await fetchMyNotes(card.id)
      }
    } catch (_err) {
      // silently handled
    }
  }

  const fetchReviewComments = async (friendUserId) => {
    try {
      const { data, error } = await supabase
        .from('review_comments')
        .select('*')
        .eq('from_user_id', profile.id)
        .eq('to_user_id', friendUserId)

      if (error) {
        setReviewComments([])
        return
      }
      setReviewComments(data || [])
    } catch (_err) {
      setReviewComments([])
    }
  }

  const handleLeaveReviewComment = async (reviewId, paragraphIndex, content) => {
    if (!friendProfile) return

    try {
      const { error } = await supabase
        .from('review_comments')
        .insert({
          review_id: reviewId,
          paragraph_index: paragraphIndex,
          from_user_id: profile.id,
          to_user_id: friendProfile.id,
          content
        })

      if (error) {
        alert('Could not save comment. Please try again.')
        return
      }

      // Notify review owner
      const review = reviews.find(r => r.id === reviewId)
      await supabase.from('notifications').insert({
        user_id: friendProfile.id,
        type: 'review_comment',
        actor_id: profile.id,
        message: `${profile.display_name} commented on your review of ${review?.title || 'a review'}`,
        reference_id: reviewId
      })

      await fetchReviewComments(friendProfile.id)
    } catch (_err) {
      alert('Could not save comment. Please try again.')
    }
  }

  const handleUpdateReviewComment = async (commentId, content) => {
    if (!friendProfile?.id) return
    try {
      const { error } = await supabase
        .from('review_comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('from_user_id', profile.id)

      if (error) throw error
      await fetchReviewComments(friendProfile.id)
    } catch (_err) {
      // silently handled
    }
  }

  const handleDeleteReviewComment = async (commentId) => {
    if (!friendProfile?.id) return
    try {
      const { error } = await supabase
        .from('review_comments')
        .delete()
        .eq('id', commentId)
        .eq('from_user_id', profile.id)

      if (error) throw error
      await fetchReviewComments(friendProfile.id)
    } catch (_err) {
      // silently handled
    }
  }

  const fetchOverlaps = async () => {
    try {
      // Step 1: Fetch all independent data in parallel
      const [myCardResult, friendCardResult, myReviewsResult, friendReviewsResult, myInterestsResult] = await Promise.all([
        supabase.from('cards').select('id').eq('user_id', profile.id).eq('is_current', true).single(),
        supabase.from('cards').select('id').eq('user_id', friendId).eq('is_current', true).single(),
        supabase.from('reviews').select('title, tag, rating').eq('user_id', profile.id),
        supabase.from('reviews').select('title, tag, rating').eq('user_id', friendId),
        supabase.from('activity_interests').select('activity_id').eq('user_id', profile.id)
      ])

      // Process review overlaps (in-memory, no further queries needed)
      if (!myReviewsResult.error && myReviewsResult.data && friendReviewsResult.data) {
        const matches = myReviewsResult.data
          .map(myReview => {
            const friendReview = friendReviewsResult.data.find(
              fr => fr.title.toLowerCase() === myReview.title.toLowerCase()
            )
            if (friendReview) {
              return {
                title: myReview.title,
                tag: myReview.tag,
                yourRating: myReview.rating,
                friendRating: friendReview.rating
              }
            }
            return null
          })
          .filter(Boolean)
        setReviewOverlaps(matches)
      }

      // Step 2: Fetch card entries and friend activity interests in parallel (depend on step 1)
      const step2Promises = []

      const myCardData = myCardResult.data
      const friendCardData = friendCardResult.data
      if (myCardData && friendCardData) {
        step2Promises.push(
          Promise.all([
            supabase.from('entries').select('category, content').eq('card_id', myCardData.id),
            supabase.from('entries').select('category, content').eq('card_id', friendCardData.id)
          ]).then(([myEntries, friendEntries]) => {
            if (myEntries.data && friendEntries.data) {
              const matches = myEntries.data
                .map(myEntry => {
                  const friendEntry = friendEntries.data.find(
                    fe => fe.content.toLowerCase() === myEntry.content.toLowerCase() &&
                          fe.category === myEntry.category
                  )
                  return friendEntry ? { category: myEntry.category, content: myEntry.content } : null
                })
                .filter(Boolean)
              setCardOverlaps(matches)
            }
          })
        )
      }

      const myActivityIds = (myInterestsResult.data || []).map(a => a.activity_id)
      if (!myInterestsResult.error && myActivityIds.length > 0) {
        step2Promises.push(
          supabase.from('activity_interests').select('activity_id').eq('user_id', friendId).in('activity_id', myActivityIds)
            .then(({ data: friendActivitiesData }) => {
              if (friendActivitiesData && friendActivitiesData.length > 0) {
                const sharedActivityIds = friendActivitiesData.map(a => a.activity_id)
                return supabase.from('activities').select('description, date_text').in('id', sharedActivityIds).eq('is_archived', false)
              }
              return null
            })
            .then(result => {
              if (result && result.data) {
                setActivityOverlaps(result.data)
              }
            })
        )
      }

      await Promise.all(step2Promises)
    } catch (_err) {
      // silently handled
    }
  }

  return (
    <div className="container">

      <div style={{ minHeight: 'calc(100vh - 120px)' }}>
        {loading ? (
          <div className="loading">Loading card...</div>
        ) : error ? (
          <div>
            <div className="error-message" style={{ textAlign: 'center' }}>{error}</div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button onClick={() => navigate('/friends')}>Back to Friends</button>
            </div>
          </div>
        ) : friendProfile ? (
          <>
            {/* Tab Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1px', marginBottom: '8px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
              <button
                onClick={() => navigate('/friends')}
                style={{
                  background: 'none',
                  border: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                  padding: '8px 8px',
                  fontSize: '13px',
                  color: '#777',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                &larr; Back
              </button>
              {FRIEND_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    boxShadow: 'none',
                    outline: 'none',
                    padding: '8px 8px',
                    fontSize: '13px',
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? '#2C2C2C' : '#777',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab === 'card' ? 'Card' : tab === 'reviews' ? 'Reviews' : tab === 'liste' ? 'La Liste' : tab === 'wishlist' ? 'Wishlist' : 'Portrait'}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  marginLeft: 'auto',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
                title={`${friendProfile.display_name}'s Profile`}
              >
                <GearSix size={18} weight="duotone" color="#7A3B2E" />
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ marginTop: '-20px' }}>
                  {activeTab === 'card' && (
                    <div style={{ marginTop: '-30px' }}>
                      <div className="container">
                        <CardDisplay
                          card={card}
                          entries={entries}
                          displayName={friendProfile.display_name}
                          photoUrl={friendProfile.profile_photo_url}
                          photoPosition={friendProfile.profile_photo_position}
                          bio={friendProfile.bio}
                          isEditable={false}
                          isFriendView={true}
                          hiddenSections={card?.hidden_sections || []}
                          sectionOrder={card?.section_order || []}
                          notes={myNotes}
                          currentUserId={profile.id}
                          onLeaveNote={handleLeaveNote}
                          onUpdateNote={handleUpdateNote}
                          onDeleteNote={handleDeleteNote}
                          cardOwnerName={friendProfile.display_name}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <ReviewsDisplay
                      reviews={reviews}
                      title={`${friendProfile.display_name}'s Reviews`}
                      emptyMessage={`${friendProfile.display_name} hasn't added any reviews yet.`}
                      renderExpandedText={(review, opts) => (
                        <ExpandedReviewText
                          review={review}
                          comments={reviewComments.filter(c => c.review_id === review.id)}
                          isOwner={false}
                          inReader={opts?.inReader}
                          currentUserId={profile.id}
                          ownerName={friendProfile.display_name}
                          commenterName={profile.display_name}
                          onLeaveComment={handleLeaveReviewComment}
                          onUpdateComment={handleUpdateReviewComment}
                          onDeleteComment={handleDeleteReviewComment}
                        />
                      )}
                    />
                  )}

                  {activeTab === 'liste' && (
                    <FriendListe friendId={friendId} friendName={friendProfile?.display_name} />
                  )}

                  {activeTab === 'wishlist' && (
                    <FriendWishlist friendId={friendId} friendName={friendProfile?.display_name} />
                  )}

                  {activeTab === 'portrait' && (
                    <Portrait userId={friendId} />
                  )}
            </div>
          </>
        ) : null}
      </div>

      {/* Friend Profile Popup — identical styling to ProfileEditModal */}
      {showProfile && friendProfile && createPortal(
        <Motion.div
          ref={profileBackdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 9999,
            overflowY: 'auto',
            paddingTop: '20px',
            paddingBottom: '20px'
          }}
          onClick={(e) => { if (e.target === profileBackdropRef.current) setShowProfile(false) }}
        >
          <Motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              background: '#FFFEFA',
              borderRadius: '3px',
              padding: '14px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
            }}
            className="profile-edit-compact"
          >
            <h3 className="handwritten" style={{ fontSize: '22px', marginBottom: '10px', marginTop: 0, textAlign: 'center' }}>
              {friendProfile.display_name}&rsquo;s Profile
            </h3>

            {/* Photo */}
            {friendProfile.profile_photo_url && (
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <img
                  src={friendProfile.profile_photo_url}
                  alt={friendProfile.display_name}
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: friendProfile.profile_photo_position || '50% 50%',
                    filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                  }}
                />
              </div>
            )}

            {/* Read-only fields */}
            {friendProfile.location && (
              <div className="form-group">
                <label className="form-label">Location</label>
                <div style={{ padding: '8px 10px', background: '#F5F1EB', borderRadius: '3px', fontSize: '14px' }}>
                  {friendProfile.location}
                </div>
              </div>
            )}

            {friendProfile.bio && (
              <div className="form-group">
                <label className="form-label">About / Interests</label>
                <div style={{ padding: '8px 10px', background: '#F5F1EB', borderRadius: '3px', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {friendProfile.bio}
                </div>
              </div>
            )}

            {friendProfile.favorite_books && (
              <div className="form-group">
                <label className="form-label">Favorite Books</label>
                <div style={{ padding: '8px 10px', background: '#F5F1EB', borderRadius: '3px', fontSize: '14px' }}>
                  {friendProfile.favorite_books}
                </div>
              </div>
            )}

            {friendProfile.favorite_artists && (
              <div className="form-group">
                <label className="form-label">Favorite Artists</label>
                <div style={{ padding: '8px 10px', background: '#F5F1EB', borderRadius: '3px', fontSize: '14px' }}>
                  {friendProfile.favorite_artists}
                </div>
              </div>
            )}

            {friendProfile.astro_sign && (
              <div className="form-group">
                <label className="form-label">Astro Sign</label>
                <div style={{ padding: '8px 10px', background: '#F5F1EB', borderRadius: '3px', fontSize: '14px' }}>
                  {friendProfile.astro_sign}
                </div>
              </div>
            )}

            {friendProfile.spirit_animal && (
              <div className="form-group">
                <label className="form-label">Spirit Animal</label>
                <div style={{ padding: '8px 10px', background: '#F5F1EB', borderRadius: '3px', fontSize: '14px' }}>
                  {friendProfile.spirit_animal}
                </div>
              </div>
            )}

            {friendProfile.favorite_quote && (
              <div className="form-group">
                <label className="form-label">Favorite Quote</label>
                <div style={{ padding: '8px 10px', background: '#F5F1EB', borderRadius: '3px', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.5, fontStyle: 'italic' }}>
                  {friendProfile.favorite_quote}
                </div>
              </div>
            )}
          </Motion.div>
        </Motion.div>,
        document.body
      )}
    </div>
  )
}
