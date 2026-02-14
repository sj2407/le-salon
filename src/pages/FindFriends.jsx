import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const FindFriends = () => {
  const { profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim() || !profile?.id) return

    try {
      setLoading(true)
      setMessage('')

      // Search by username, email, or display name
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .neq('id', profile.id)
        .limit(10)

      if (error) throw error

      // Batch-check existing friendships instead of N+1 queries
      const userIds = data.map(u => u.id)
      const { data: existingFriendships } = await supabase
        .from('friendships')
        .select('requester_id, recipient_id')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .or(`requester_id.in.(${userIds.join(',')}),recipient_id.in.(${userIds.join(',')})`)

      const friendedIds = new Set()
      if (existingFriendships) {
        existingFriendships.forEach(f => {
          if (f.requester_id === profile.id) friendedIds.add(f.recipient_id)
          if (f.recipient_id === profile.id) friendedIds.add(f.requester_id)
        })
      }

      const filteredResults = data.filter(user => !friendedIds.has(user.id))

      setSearchResults(filteredResults)

      if (filteredResults.length === 0) {
        setMessage('No users found')
      }
    } catch (_err) {
      setMessage('Error searching for users')
    } finally {
      setLoading(false)
    }
  }

  const handleSendRequest = async (recipientId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: profile.id,
          recipient_id: recipientId,
          status: 'pending'
        })

      if (error) throw error

      // Create notification for recipient
      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: 'friend_request',
          actor_id: profile.id,
          message: `${profile.display_name} wants to be friends`
        })

      setMessage('Friend request sent!')
      setSearchResults(searchResults.filter(user => user.id !== recipientId))
    } catch (_err) {
      setMessage('Error sending friend request')
    }
  }

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px', textAlign: 'center' }}>
        Find Friends
      </h1>

      <form onSubmit={handleSearch} style={{ marginBottom: '32px' }}>
        <div className="form-group">
          <label className="form-label">Search by email or username</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="sarah_reads or [email protected]"
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={loading} className="primary">
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {message && (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          textAlign: 'center',
          borderRadius: '3px',
          background: message.includes('Error') ? '#FFE5E5' : '#E5FFE5',
          color: message.includes('Error') ? '#C75D5D' : '#5B8C5A'
        }}>
          {message}
        </div>
      )}

      {searchResults.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {searchResults.map((user) => (
            <div key={user.id} style={{
              padding: '16px',
              borderRadius: '3px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#FFFEFA',
              boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{user.display_name}</div>
                <div style={{ fontSize: '14px', color: '#777' }}>@{user.username}</div>
              </div>
              <button onClick={() => handleSendRequest(user.id)} className="primary">
                Send Request
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
