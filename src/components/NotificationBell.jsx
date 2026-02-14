import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getRelativeTime } from '../lib/timeUtils'

export const NotificationBell = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (profile) {
      fetchUnreadCount()

      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`
          },
          () => {
            fetchUnreadCount()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [profile])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('read', false)

      if (error) throw error
      setUnreadCount(count || 0)
    } catch {
      // silently handled
    }
  }

  const fetchUnreadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('read', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch {
      return []
    }
  }

  const markAllAsRead = async (notificationIds) => {
    if (notificationIds.length === 0) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notificationIds)

      if (error) throw error
    } catch {
      // silently handled
    }
  }

  const handleBellClick = async () => {
    if (!isOpen) {
      // Opening dropdown - fetch and mark as read
      const unread = await fetchUnreadNotifications()
      setNotifications(unread)

      // Mark all as read immediately
      const notificationIds = unread.map(n => n.id)
      await markAllAsRead(notificationIds)

      // Clear badge
      setUnreadCount(0)
      setIsOpen(true)
    } else {
      // Closing dropdown
      setIsOpen(false)
    }
  }

  const handleNotificationClick = (notification) => {
    setIsOpen(false)

    // Navigate based on notification type
    switch (notification.type) {
      case 'friend_request':
        navigate('/friends')
        break
      case 'friend_accepted':
        navigate(`/friend/${notification.actor_id}`)
        break
      case 'activity_interest':
        navigate('/todo')
        break
      case 'recommendation':
        navigate('/my-corner?tab=liste')
        break
      case 'wishlist_claimed':
        navigate('/wishlist')
        break
      case 'card_note':
        if (notification.reference_name === 'reply') {
          navigate(`/friend/${notification.actor_id}`)
        } else {
          navigate('/my-corner')
        }
        break
      case 'review_comment':
        if (notification.reference_name === 'reply') {
          navigate(`/friend/${notification.actor_id}`)
        } else {
          navigate('/my-corner')
        }
        break
      default:
        break
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleBellClick}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          marginRight: '-2px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}
        aria-label="Notifications"
      >
        {/* Bell Icon SVG */}
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
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            right: '8px',
            width: 'min(340px, calc(100vw - 16px))',
            maxHeight: '70vh',
            overflowY: 'auto',
            background: '#FFFEFA',
            borderRadius: '8px',
            boxShadow: '2px 4px 12px rgba(0, 0, 0, 0.12)',
            zIndex: 1000
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px dashed #D0D0D0',
              fontFamily: 'Caveat, cursive',
              fontSize: '24px',
              fontWeight: 600
            }}
          >
            Notifications
          </div>

          {/* Notification List */}
          {notifications.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                fontStyle: 'italic',
                color: '#999'
              }}
            >
              You're all caught up!
            </div>
          ) : (
            <div>
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '12px 16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F5F1EB'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ fontSize: '14px', lineHeight: 1.4, marginBottom: '4px' }}>
                      {notification.message}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {getRelativeTime(notification.created_at)}
                    </div>
                  </button>
                  {index < notifications.length - 1 && (
                    <div style={{ borderTop: '1px dashed #E0E0E0', margin: '0 16px' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer with "See all" link */}
          <div style={{ borderTop: '1px dashed #D0D0D0', padding: '12px 16px', textAlign: 'center' }}>
            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/notifications')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#4A7BA7',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontWeight: 500
              }}
            >
              See all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
