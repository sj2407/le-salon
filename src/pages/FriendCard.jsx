import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CardDisplay } from '../components/CardDisplay'

export const FriendCard = () => {
  const { friendId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [friendProfile, setFriendProfile] = useState(null)
  const [card, setCard] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    } catch (err) {
      console.error('Error fetching friend card:', err)
      setError(err.message)
    } finally {
      setLoading(false)
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
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/friends')}>← Back to Friends</button>
      </div>

      {friendProfile && (
        <CardDisplay
          card={card}
          entries={entries}
          displayName={friendProfile.display_name}
          isEditable={false}
        />
      )}
    </div>
  )
}
