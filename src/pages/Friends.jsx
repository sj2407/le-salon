import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const Friends = () => {
  const { profile } = useAuth()
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
    } catch (_err) {
      // silently handled
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
    } catch (_err) {
      // silently handled
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading friends...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px', textAlign: 'center' }}>
        My Friends
      </h1>

      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <Link to="/find-friends">
          <button className="primary">Find Friends</button>
        </Link>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#666' }}>
            Pending Requests
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingRequests.map((req, index) => (
              <div key={req.id} style={{
                padding: '16px',
                border: 'none',
                borderRadius: '3px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#FFFEFA',
                transform: `rotate(${index % 2 === 0 ? '-0.5' : '0.5'}deg)`,
                boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                animation: `reviewSway${(index % 3) + 1} ${5 + index % 2}s ease-in-out infinite`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{req.friendProfile.display_name}</div>
                    <div style={{ fontSize: '14px', color: '#777' }}>@{req.friendProfile.username}</div>
                  </div>
                  {req.friendProfile.profile_photo_url && (
                    <img
                      src={req.friendProfile.profile_photo_url}
                      alt={req.friendProfile.display_name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #2C2C2C',
                        flexShrink: 0
                      }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleAccept(req.id)} className="primary" style={{ padding: '8px 16px' }}>
                    Accept
                  </button>
                  <button onClick={() => handleDecline(req.id)} style={{ padding: '8px 16px' }}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#666' }}>
            Sent Requests
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sentRequests.map((req, index) => (
              <div key={req.id} style={{
                padding: '16px',
                border: 'none',
                borderRadius: '3px',
                background: '#FFFEFA',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transform: `rotate(${index % 2 === 0 ? '-0.5' : '0.5'}deg)`,
                boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                animation: `reviewSway${(index % 3) + 1} ${5 + index % 2}s ease-in-out infinite`
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{req.friendProfile.display_name}</div>
                  <div style={{ fontSize: '14px', color: '#777' }}>@{req.friendProfile.username} — Pending</div>
                </div>
                {req.friendProfile.profile_photo_url && (
                  <img
                    src={req.friendProfile.profile_photo_url}
                    alt={req.friendProfile.display_name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #2C2C2C',
                      flexShrink: 0
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends List */}
      <section>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#666' }}>
          Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
            No friends yet. Start by finding some friends!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {friends.map((friendship, index) => (
              <Link
                key={friendship.id}
                to={`/friend/${friendship.friendProfile.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  padding: '16px',
                  border: 'none',
                  borderRadius: '3px',
                  background: '#FFFEFA',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transform: `rotate(${index % 2 === 0 ? '-0.5' : '0.5'}deg)`,
                  boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                  animation: `reviewSway${(index % 3) + 1} ${5 + index % 2}s ease-in-out infinite`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F5F1EB'
                  e.currentTarget.style.boxShadow = '2px 2px 0 #2C2C2C'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFEFA'
                  e.currentTarget.style.boxShadow = 'none'
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{friendship.friendProfile.display_name}</div>
                    <div style={{ fontSize: '14px', color: '#777' }}>@{friendship.friendProfile.username}</div>
                  </div>
                  {friendship.friendProfile.profile_photo_url && (
                    <img
                      src={friendship.friendProfile.profile_photo_url}
                      alt={friendship.friendProfile.display_name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #2C2C2C',
                        flexShrink: 0
                      }}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
