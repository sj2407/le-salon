import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CardDisplay } from '../components/CardDisplay'
import { FriendWishlist } from '../components/FriendWishlist'
import { FriendProfile } from '../components/FriendProfile'
import { ReviewsDisplay, TAG_ICONS } from '../components/ReviewsDisplay'

export const FriendCard = () => {
  const { friendId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [friendProfile, setFriendProfile] = useState(null)
  const [card, setCard] = useState(null)
  const [entries, setEntries] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('card')
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

      // Verify friendship exists
      const { data: friendshipData, error: friendshipError } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${profile.id},recipient_id.eq.${friendId}),and(requester_id.eq.${friendId},recipient_id.eq.${profile.id})`)
        .single()

      if (friendshipError || !friendshipData) {
        setError('You are not friends with this user')
        return
      }

      // Get friend profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', friendId)
        .single()

      if (profileError) throw profileError
      setFriendProfile(profileData)

      // Get friend's current card
      const { data: cardData, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', friendId)
        .eq('is_current', true)
        .single()

      if (cardError && cardError.code !== 'PGRST116') {
        throw cardError
      }

      if (cardData) {
        setCard(cardData)

        // Get entries
        const { data: entriesData, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .eq('card_id', cardData.id)
          .order('display_order')

        if (entriesError) throw entriesError
        setEntries(entriesData || [])
      }

      // Get friend's reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', friendId)
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError
      setReviews(reviewsData || [])
    } catch (err) {
      console.error('Error fetching friend card:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchOverlaps = async () => {
    try {
      // 1. Card overlaps - matching content on current cards
      // Get my current card entries
      const { data: myCardData } = await supabase
        .from('cards')
        .select('id')
        .eq('user_id', profile.id)
        .eq('is_current', true)
        .single()

      const { data: friendCardData } = await supabase
        .from('cards')
        .select('id')
        .eq('user_id', friendId)
        .eq('is_current', true)
        .single()

      if (myCardData && friendCardData) {
        const { data: myEntries } = await supabase
          .from('entries')
          .select('category, content')
          .eq('card_id', myCardData.id)

        const { data: friendEntries } = await supabase
          .from('entries')
          .select('category, content')
          .eq('card_id', friendCardData.id)

        if (myEntries && friendEntries) {
          // Find matching content (case-insensitive)
          const matches = myEntries
            .map(myEntry => {
              const friendEntry = friendEntries.find(
                fe => fe.content.toLowerCase() === myEntry.content.toLowerCase() &&
                      fe.category === myEntry.category
              )
              if (friendEntry) {
                return {
                  category: myEntry.category,
                  content: myEntry.content
                }
              }
              return null
            })
            .filter(Boolean)

          setCardOverlaps(matches)
        }
      }

      // 2. Review overlaps - same titles reviewed
      const { data: reviewOverlapsData, error: reviewError } = await supabase
        .from('reviews')
        .select('title, tag, rating')
        .eq('user_id', profile.id)

      if (!reviewError && reviewOverlapsData) {
        // Get friend's reviews
        const { data: friendReviewsData } = await supabase
          .from('reviews')
          .select('title, tag, rating')
          .eq('user_id', friendId)

        if (friendReviewsData) {
          // Find matching titles (case-insensitive)
          const matches = reviewOverlapsData
            .map(myReview => {
              const friendReview = friendReviewsData.find(
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
      }

      // 3. Activity overlaps - shared activity interests
      const { data: activityOverlapsData, error: activityError } = await supabase
        .from('activity_interests')
        .select('activity_id')
        .eq('user_id', profile.id)

      if (!activityError && activityOverlapsData) {
        const myActivityIds = activityOverlapsData.map(a => a.activity_id)

        if (myActivityIds.length > 0) {
          const { data: friendActivitiesData } = await supabase
            .from('activity_interests')
            .select('activity_id')
            .eq('user_id', friendId)
            .in('activity_id', myActivityIds)

          if (friendActivitiesData && friendActivitiesData.length > 0) {
            const sharedActivityIds = friendActivitiesData.map(a => a.activity_id)

            const { data: activitiesData } = await supabase
              .from('activities')
              .select('description, date_text')
              .in('id', sharedActivityIds)
              .eq('is_archived', false)

            setActivityOverlaps(activitiesData || [])
          }
        }
      }
    } catch (err) {
      console.error('Error fetching overlaps:', err)
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
              onClick={() => setActiveTab('card')}
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
              onClick={() => setActiveTab('reviews')}
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
              onClick={() => setActiveTab('overlap')}
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
              onClick={() => setActiveTab('wishlist')}
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
              onClick={() => setActiveTab('profile')}
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
          <div style={{ marginTop: '-20px' }}>
          {activeTab === 'card' && (
            <CardDisplay
              card={card}
              entries={entries}
              displayName={friendProfile.display_name}
              photoUrl={friendProfile.profile_photo_url}
              isEditable={false}
            />
          )}

          {activeTab === 'reviews' && (
            <ReviewsDisplay
              reviews={reviews}
              emptyMessage={`${friendProfile.display_name} hasn't added any reviews yet.`}
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
          </div>
        </>
      )}
    </div>
  )
}
