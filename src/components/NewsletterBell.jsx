import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const NewsletterBell = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (profile) {
      fetchUnreadCount()
    }
  }, [profile])

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('newsletters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('read', false)

      if (error) throw error
      setUnreadCount(count || 0)
    } catch (err) {
      console.error('Error fetching unread newsletter count:', err)
    }
  }

  const handleLetterClick = () => {
    navigate('/newsletter')
  }

  return (
    <button
      onClick={handleLetterClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}
      aria-label="Newsletter"
    >
      {/* Letter/Envelope Icon SVG */}
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
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 5L2 7" />
      </svg>

      {/* Badge */}
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#E8534F',
            color: 'white',
            borderRadius: '8px',
            padding: '1px 4px',
            fontSize: '9px',
            fontWeight: 600,
            lineHeight: 1,
            minWidth: '14px',
            textAlign: 'center'
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
