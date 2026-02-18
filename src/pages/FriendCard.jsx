import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CardDisplay } from '../components/CardDisplay'
import { FriendWishlist } from '../components/FriendWishlist'
import { FriendProfile } from '../components/FriendProfile'
import { ReviewsDisplay } from '../components/ReviewsDisplay'
import { TAG_ICONS } from '../lib/reviewConstants'
import { ExpandedReviewText } from '../components/review-comments/ExpandedReviewText'
import { useSwipeNavigation, tabSlideVariants, tabSlideTransition } from '../lib/useSwipeNavigation'

const FRIEND_TABS = ['card', 'reviews', 'overlap', 'wishlist', 'profile']

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
  const { containerRef, swipeHandlers, direction, handleTabClick } = useSwipeNavigation(FRIEND_TABS, activeTab, setActiveTab)
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

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading card...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message" style={{ textAlign: 'center' }}>{error}</div>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => navigate('/friends')}>Back to Friends</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ position: 'relative' }}>
      {/* Back button - positioned top right */}
      <button
        onClick={() => navigate('/friends')}
        style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: 'none',
          border: 'none',
          fontSize: '13px',
          color: '#777',
          cursor: 'pointer',
          padding: '4px 8px'
        }}
      >
        Back
      </button>

      {friendProfile && (
        <>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '1px', marginBottom: '8px', overflowX: 'auto', paddingLeft: '20px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
            <button
              onClick={() => handleTabClick('card')}
              style={{
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                padding: '8px 10px',
                fontSize: '13px',
                fontWeight: activeTab === 'card' ? 600 : 400,
                color: activeTab === 'card' ? '#2C2C2C' : '#777',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              Card
            </button>
            <button
              onClick={() => handleTabClick('reviews')}
              style={{
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                padding: '8px 10px',
                fontSize: '13px',
                fontWeight: activeTab === 'reviews' ? 600 : 400,
                color: activeTab === 'reviews' ? '#2C2C2C' : '#777',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              Reviews
            </button>
            <button
              onClick={() => handleTabClick('overlap')}
              style={{
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                padding: '8px 10px',
                fontSize: '13px',
                fontWeight: activeTab === 'overlap' ? 600 : 400,
                color: activeTab === 'overlap' ? '#2C2C2C' : '#777',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              Overlap
            </button>
            <button
              onClick={() => handleTabClick('wishlist')}
              style={{
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                padding: '8px 10px',
                fontSize: '13px',
                fontWeight: activeTab === 'wishlist' ? 600 : 400,
                color: activeTab === 'wishlist' ? '#2C2C2C' : '#777',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              Wishlist
            </button>
            <button
              onClick={() => handleTabClick('profile')}
              style={{
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                padding: '8px 10px',
                fontSize: '13px',
                fontWeight: activeTab === 'profile' ? 600 : 400,
                color: activeTab === 'profile' ? '#2C2C2C' : '#777',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              Profile
            </button>
          </div>

          {/* Tab Content */}
          <div ref={containerRef} style={{ marginTop: '-20px', overflow: 'hidden', touchAction: 'pan-y' }} {...swipeHandlers}>
          <AnimatePresence mode="wait" initial={false} custom={direction.current}>
            <Motion.div
              key={activeTab}
              custom={direction.current}
              variants={tabSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={tabSlideTransition}
            >
          {activeTab === 'card' && (
            <div style={{ marginTop: '-40px' }}>
              <div className="container">
                <CardDisplay
                  card={card}
                  entries={entries}
                  displayName={friendProfile.display_name}
                  photoUrl={friendProfile.profile_photo_url}
                  isEditable={false}
                  isFriendView={true}
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
              emptyMessage={`${friendProfile.display_name} hasn't added any reviews yet.`}
              renderExpandedText={(review) => (
                <ExpandedReviewText
                  review={review}
                  comments={reviewComments.filter(c => c.review_id === review.id)}
                  isOwner={false}
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

          {activeTab === 'overlap' && (
            <div style={{ maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '40px' }}>
              <h2 className="handwritten" style={{ fontSize: '32px', marginTop: '24px', marginBottom: '16px' }}>
                What you have in common
              </h2>

              {/* Section 1: Currently Matching Cards */}
              {cardOverlaps.length > 0 && (
                <div style={{ marginBottom: '48px', marginLeft: '-20px', background: '#FFFEFA', border: 'none', borderRadius: '2px', padding: '24px', boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)', transform: 'rotate(0.7deg)', animation: 'gentleSway1 5s ease-in-out infinite', position: 'relative' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '16px', fontWeight: 600 }}>
                    Currently Matching
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                    {cardOverlaps.map((overlap, index) => (
                      <li
                        key={index}
                        style={{
                          fontSize: '15px',
                          fontStyle: 'italic',
                          marginBottom: '8px',
                          lineHeight: 1.6
                        }}
                      >
                        You're both {overlap.category.toLowerCase()}: <strong>{overlap.content}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 2: Shared Reviews */}
              {reviewOverlaps.length > 0 && (
                <div style={{ marginBottom: '48px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '16px', fontWeight: 600 }}>
                    Shared Reviews
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reviewOverlaps.map((overlap, index) => (
                      <div
                        key={index}
                        style={{
                          background: '#FFFEFA',
                          borderRadius: '3px',
                          padding: '16px',
                          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{TAG_ICONS[overlap.tag]}</span>
                          <strong style={{ fontSize: '16px' }}>{overlap.title}</strong>
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          You: <span className="handwritten" style={{ fontSize: '18px', color: '#2C2C2C' }}>{overlap.yourRating}/10</span>
                          {' '} • {' '}
                          {friendProfile?.display_name}: <span className="handwritten" style={{ fontSize: '18px', color: '#2C2C2C' }}>{overlap.friendRating}/10</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Shared Activity Interest */}
              {activityOverlaps.length > 0 && (
                <div style={{ marginBottom: '48px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '16px', fontWeight: 600 }}>
                    Shared Activity Interest
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                    {activityOverlaps.map((activity, index) => (
                      <li
                        key={index}
                        style={{
                          fontSize: '15px',
                          fontStyle: 'italic',
                          marginBottom: '8px',
                          lineHeight: 1.6
                        }}
                      >
                        You're both interested in: <strong>{activity.description}</strong>
                        {activity.date_text && ` (${activity.date_text})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Empty State */}
              {cardOverlaps.length === 0 && reviewOverlaps.length === 0 && activityOverlaps.length === 0 && (
                <div style={{ padding: '20px 0' }}>
                  <p style={{ fontSize: '16px', color: '#666', margin: 0, fontStyle: 'italic' }}>
                    No overlaps yet — check back as you both update your cards!
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <FriendWishlist friendId={friendId} friendName={friendProfile?.display_name} />
          )}

          {activeTab === 'profile' && (
            <FriendProfile friendId={friendId} friendName={friendProfile?.display_name} />
          )}
            </Motion.div>
          </AnimatePresence>
          </div>
        </>
      )}
    </div>
  )
}
