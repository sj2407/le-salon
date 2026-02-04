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
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      setMessage('')

      // Search by username or email
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .neq('id', profile.id)
        .limit(10)

      if (error) throw error

      // Filter out users who are already friends or have pending requests
      const filteredResults = []
      for (const user of data) {
        const { data: existingFriendship } = await supabase
          .from('friendships')
          .select('*')
          .or(`and(requester_id.eq.${profile.id},recipient_id.eq.${user.id}),and(requester_id.eq.${user.id},recipient_id.eq.${profile.id})`)
          .single()

        if (!existingFriendship) {
          filteredResults.push(user)
        }
      }

      setSearchResults(filteredResults)

      if (filteredResults.length === 0) {
        setMessage('No users found')
      }
    } catch (err) {
      console.error('Error searching:', err)
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
    } catch (err) {
      console.error('Error sending request:', err)
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
              border: '1.5px solid #2C2C2C',
              borderRadius: '3px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#FFFEFA'
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
