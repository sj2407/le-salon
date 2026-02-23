import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { EnvelopeSimple } from '@phosphor-icons/react'

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
    } catch {
      // silently handled
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
        padding: '8px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}
      aria-label="Newsletter"
    >
      <EnvelopeSimple size={18} weight="duotone" color="#7A3B2E" />

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
