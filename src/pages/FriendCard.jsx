import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CardDisplay } from '../components/CardDisplay'

const TAG_ICONS = {
  movie: '🎬',
  book: '📖',
  podcast: '🎧',
  show: '📺',
  album: '💿',
  other: '✨'
}

export const FriendCard = () => {
  const { friendId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [friendProfile, setFriendProfile] = useState(null)
  const [card, setCard] = useState(null)
  const [entries, setEntries] = useState([])
  const [reviews, setReviews] = useState([])
  const [expandedReviews, setExpandedReviews] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('card')

  useEffect(() => {
    if (profile && friendId) {
      fetchFriendCard()
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
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/friends')}>← Back to Friends</button>
      </div>

      {friendProfile && (
        <>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', borderBottom: '2px solid #E8E8E8' }}>
            <button
              onClick={() => setActiveTab('card')}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: activeTab === 'card' ? 600 : 400,
                color: activeTab === 'card' ? '#2C2C2C' : '#777',
                borderBottom: activeTab === 'card' ? '3px solid #2C2C2C' : '3px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Card
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: activeTab === 'reviews' ? 600 : 400,
                color: activeTab === 'reviews' ? '#2C2C2C' : '#777',
                borderBottom: activeTab === 'reviews' ? '3px solid #2C2C2C' : '3px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Reviews
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'card' && (
            <CardDisplay
              card={card}
              entries={entries}
              displayName={friendProfile.display_name}
              isEditable={false}
            />
          )}

          {activeTab === 'reviews' && (
            <div style={{ maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>
              {reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
                  {friendProfile.display_name} hasn't added any reviews yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((review) => (
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
                {/* Single line: Icon + Title + Rating + Expand */}
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
            </div>
          )}
        </>
      )}
    </div>
  )
}
