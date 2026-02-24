import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ADMIN_USER_ID = '2c90c849-f767-443e-a0e3-1d1438eac6f4'

export const AdminFeedback = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      // Check if user is admin
      if (profile.id !== ADMIN_USER_ID) {
        navigate('/')
        return
      }
      fetchFeedback()
    }
  }, [profile, navigate])

  const fetchFeedback = async () => {
    try {
      setLoading(true)

      // Fetch all feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })

      if (feedbackError) throw feedbackError

      // Fetch user profiles for feedback authors
      const userIds = [...new Set(feedbackData.map(f => f.user_id).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, email, username')
          .in('id', userIds)

        if (profilesError) throw profilesError

        const profilesMap = {}
        profilesData.forEach(p => {
          profilesMap[p.id] = p
        })
        setProfiles(profilesMap)
      }

      setFeedback(feedbackData || [])
    } catch (_err) {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (feedbackId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ is_read: !currentStatus })
        .eq('id', feedbackId)

      if (error) throw error
      fetchFeedback()
    } catch (_err) {
      // silently handled
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading feedback...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px' }}>
        Feedback
      </h1>

      {feedback.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          No feedback yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#FFFEFA',
              border: '2px solid #2C2C2C',
              borderRadius: '4px',
              boxShadow: '4px 4px 0 #2C2C2C'
            }}
          >
            <thead>
              <tr style={{ background: '#F5F1EB', borderBottom: '2px solid #2C2C2C' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', width: '140px' }}>
                  Date
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', width: '180px' }}>
                  User
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8' }}>
                  Feedback
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, width: '100px' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item, index) => {
                const user = profiles[item.user_id]
                return (
                  <tr key={item.id} style={{ borderBottom: index < feedback.length - 1 ? '1px solid #E8E8E8' : 'none', opacity: item.is_read ? 0.6 : 1 }}>
                    <td style={{ padding: '16px', fontSize: '13px', borderRight: '1px solid #E8E8E8' }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {user ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{user.display_name}</div>
                          <div style={{ fontSize: '12px', color: '#777' }}>@{user.username}</div>
                        </>
                      ) : (
                        <span style={{ color: '#777', fontStyle: 'italic' }}>Anonymous</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8', lineHeight: 1.5 }}>
                      {item.content}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => markAsRead(item.id, item.is_read)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: item.is_read ? '#D0E0D0' : '#FFFEFA',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        {item.is_read ? '✓ Read' : 'Mark Read'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
