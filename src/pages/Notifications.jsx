import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getRelativeTime } from '../lib/timeUtils'
import { getNotificationRoute } from '../lib/notificationUtils'

const NotificationItem = ({ notification, onClick }) => (
  <button
    onClick={() => onClick(notification)}
    style={{
      width: '100%',
      background: notification.read ? '#FFFEFA' : '#FFF9E6',
      border: 'none',
      borderRadius: '3px',
      padding: '16px',
      textAlign: 'left',
      cursor: 'pointer',
      boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = '#F5F1EB'
      e.currentTarget.style.boxShadow = '2px 2px 0 #2C2C2C'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = notification.read ? '#FFFEFA' : '#FFF9E6'
      e.currentTarget.style.boxShadow = '2px 3px 8px rgba(0, 0, 0, 0.1)'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      {!notification.read && (
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#E8534F',
          flexShrink: 0
        }} />
      )}
      <div style={{ fontSize: '15px', lineHeight: 1.4, flex: 1 }}>
        {notification.message}
      </div>
    </div>
    <div style={{ fontSize: '13px', color: '#999', marginLeft: notification.read ? '0' : '16px' }}>
      {getRelativeTime(notification.created_at)}
    </div>
  </button>
)

const NotificationSection = ({ title, notifications, onClick }) => {
  if (notifications.length === 0) return null
  return (
    <section>
      <h2 style={{
        fontSize: '18px',
        marginBottom: '16px',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#666'
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={onClick}
          />
        ))}
      </div>
    </section>
  )
}

export const Notifications = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchAllNotifications()
    }
  }, [profile])

  const fetchAllNotifications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (_err) {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = (notification) => {
    const route = getNotificationRoute(notification)
    if (route) navigate(route)
  }

  const groupByDate = (notifications) => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    notifications.forEach(notification => {
      const notifDate = new Date(notification.created_at)
      if (notifDate >= today) {
        groups.today.push(notification)
      } else if (notifDate >= yesterday) {
        groups.yesterday.push(notification)
      } else if (notifDate >= weekAgo) {
        groups.thisWeek.push(notification)
      } else {
        groups.older.push(notification)
      }
    })

    return groups
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading notifications...</div>
      </div>
    )
  }

  const grouped = groupByDate(notifications)

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '24px', marginTop: '8px', marginLeft: '10px' }}>
        Notifications
      </h1>

      {notifications.length === 0 ? (
        <div style={{
          background: '#FFFEFA',
          borderRadius: '3px',
          padding: '48px 32px',
          textAlign: 'center',
          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
            No notifications yet. When friends interact with your content, you'll see it here!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <NotificationSection title="Today" notifications={grouped.today} onClick={handleNotificationClick} />
          <NotificationSection title="Yesterday" notifications={grouped.yesterday} onClick={handleNotificationClick} />
          <NotificationSection title="This Week" notifications={grouped.thisWeek} onClick={handleNotificationClick} />
          <NotificationSection title="Older" notifications={grouped.older} onClick={handleNotificationClick} />
        </div>
      )}
    </div>
  )
}
