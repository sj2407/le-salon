import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { PendingFold } from '../components/friends/PendingFold'
import { FriendFanDeck } from '../components/friends/FriendFanDeck'

export const Friends = () => {
  const { profile } = useAuth()
  const toast = useToast()
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchFriendships()
    }
  }, [profile])

  const fetchFriendships = async () => {
    try {
      setLoading(true)

      // Get all friendships where user is involved
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)

      if (friendshipsError) throw friendshipsError

      // Collect all friend IDs and batch-fetch profiles
      const friendIds = friendshipsData.map(f =>
        f.requester_id === profile.id ? f.recipient_id : f.requester_id
      )

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds)

      if (profilesError) throw profilesError

      const profilesMap = {}
      profilesData.forEach(p => { profilesMap[p.id] = p })

      // Separate into categories
      const accepted = []
      const pending = []
      const sent = []

      for (const friendship of friendshipsData) {
        const friendId = friendship.requester_id === profile.id
          ? friendship.recipient_id
          : friendship.requester_id

        const friendProfile = profilesMap[friendId]
        if (!friendProfile) continue

        const friendshipWithProfile = { ...friendship, friendProfile }

        if (friendship.status === 'accepted') {
          accepted.push(friendshipWithProfile)
        } else if (friendship.status === 'pending') {
          if (friendship.recipient_id === profile.id) {
            pending.push(friendshipWithProfile)
          } else {
            sent.push(friendshipWithProfile)
          }
        }
      }

      setFriends(accepted)
      setPendingRequests(pending)
      setSentRequests(sent)
    } catch (_err) {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (friendshipId) => {
    try {
      // Get the friendship to find the requester
      const friendship = pendingRequests.find(req => req.id === friendshipId)

      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)

      if (error) throw error

      // Create notification for requester
      if (friendship) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: friendship.requester_id,
            type: 'friend_accepted',
            actor_id: profile.id,
            message: `${profile.display_name} accepted your friend request`
          })

        if (notifError) {
          // silently handled
        }
      }

      await fetchFriendships()
      toast.success('Friend request accepted')
    } catch (_err) {
      toast.error('Something went wrong')
    }
  }

  const handleDecline = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', friendshipId)

      if (error) throw error
      await fetchFriendships()
      toast.success('Request declined')
    } catch (_err) {
      toast.error('Something went wrong')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading friends...</div>
      </div>
    )
  }

  const hasPending = pendingRequests.length > 0 || sentRequests.length > 0

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      {/* Header row: title + Find Friends link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <h1 className="handwritten" style={{ fontSize: '42px', margin: 0 }}>
          My Friends
        </h1>
        <Link
          to="/find-friends"
          style={{
            textDecoration: 'none',
            color: '#622722',
            fontFamily: "'Caveat', cursive",
            fontSize: '20px',
            fontWeight: 600
          }}
        >
          + Find Friends
        </Link>
      </div>

      {/* Pending Fold — hidden when empty */}
      {hasPending && (
        <PendingFold
          pendingRequests={pendingRequests}
          sentRequests={sentRequests}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}

      {/* Fan Deck — vertically centered */}
      <FriendFanDeck friends={friends} />
    </div>
  )
}
