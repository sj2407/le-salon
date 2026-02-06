import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const FriendSearch = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const searchFriends = async (searchQuery) => {
    if (!searchQuery.trim() || !profile) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      // Get accepted friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, recipient_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)

      if (!friendships || friendships.length === 0) {
        setResults([])
        return
      }

      // Get friend IDs
      const friendIds = friendships.map(f =>
        f.requester_id === profile.id ? f.recipient_id : f.requester_id
      )

      // Search friends by name
      const { data: friends } = await supabase
        .from('profiles')
        .select('id, display_name, profile_photo_url')
        .in('id', friendIds)
        .ilike('display_name', `%${searchQuery}%`)
        .limit(5)

      setResults(friends || [])
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setQuery(value)
    searchFriends(value)
  }

  const handleSelectFriend = (friendId) => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    navigate(`/friend/${friendId}`)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          paddingRight: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Search friends"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2C2C2C"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: '250px',
            background: '#FFFEFA',
            borderRadius: '3px',
            boxShadow: '2px 3px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search friends..."
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              borderBottom: '1px solid #E8E0D0',
              fontSize: '14px',
              outline: 'none',
              background: 'transparent'
            }}
          />

          {loading && (
            <div style={{ padding: '12px', color: '#999', fontSize: '13px' }}>
              Searching...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div style={{ padding: '12px', color: '#999', fontSize: '13px' }}>
              No friends found
            </div>
          )}

          {results.length > 0 && (
            <div>
              {results.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => handleSelectFriend(friend.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F5F1EB'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {friend.profile_photo_url ? (
                    <img
                      src={friend.profile_photo_url}
                      alt=""
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#E8E0D0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#666'
                      }}
                    >
                      {friend.display_name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <span>{friend.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
