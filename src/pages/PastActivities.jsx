import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export const PastActivities = () => {
  const { profile } = useAuth()
  const [activities, setActivities] = useState([])
  const [profiles, setProfiles] = useState({})
  const [interests, setInterests] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchPastActivities()
    }
  }, [profile])

  const fetchPastActivities = async () => {
    try {
      setLoading(true)

      // Fetch archived activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('is_archived', true)
        .order('date_parsed', { ascending: false, nullsLast: false })

      if (activitiesError) throw activitiesError

      // Fetch all interests
      const activityIds = activitiesData.map((a) => a.id)
      if (activityIds.length > 0) {
        const { data: interestsData, error: interestsError } = await supabase
          .from('activity_interests')
          .select('*')
          .in('activity_id', activityIds)

        if (interestsError) throw interestsError

        // Group interests by activity_id
        const interestsByActivity = {}
        interestsData.forEach((interest) => {
          if (!interestsByActivity[interest.activity_id]) {
            interestsByActivity[interest.activity_id] = []
          }
          interestsByActivity[interest.activity_id].push(interest)
        })

        // Fetch profiles for all users involved
        const userIds = [
          ...new Set([
            ...activitiesData.map((a) => a.user_id),
            ...interestsData.map((i) => i.user_id)
          ])
        ]

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', userIds)

        if (profilesError) throw profilesError

        const profilesMap = {}
        profilesData.forEach((p) => {
          profilesMap[p.id] = p
        })

        setInterests(interestsByActivity)
        setProfiles(profilesMap)
      }

      setActivities(activitiesData)
    } catch (_err) {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  const getInterestedInitials = (activityId) => {
    const activityInterests = interests[activityId] || []
    return activityInterests
      .map((interest) => {
        const user = profiles[interest.user_id]
        return user ? user.username.substring(0, 3) : ''
      })
      .filter(Boolean)
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading past activities...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Link to="/todo" style={{ color: '#4A7BA7', fontSize: '14px', textDecoration: 'underline' }}>
          ← Back to current activities
        </Link>
      </div>

      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px', textAlign: 'center' }}>
        Past Activities
      </h1>

      {activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          No past activities yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#FFFEFA',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
            <thead>
              <tr style={{ background: '#F5F1EB', borderBottom: '1px solid #E0D6C8' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '120px' }}>
                  Friend
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '200px' }}>
                  Activity
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '100px' }}>
                  Date
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '100px' }}>
                  City
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '120px' }}>
                  Location
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '80px' }}>
                  Price
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, minWidth: '150px' }}>
                  Interested
                </th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, index) => {
                const poster = profiles[activity.user_id]
                const interestedInitials = getInterestedInitials(activity.id)

                return (
                  <tr key={activity.id} style={{ borderBottom: index < activities.length - 1 ? '1px solid #E8E8E8' : 'none', opacity: 0.7 }}>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {poster?.display_name || 'Unknown'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', fontStyle: 'italic', borderRight: '1px solid #E8E8E8' }}>
                      {activity.description}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {activity.date_text || '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {activity.city || '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {activity.location || '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {activity.price || '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      {interestedInitials.length > 0 ? (
                        <span style={{ color: '#777', fontSize: '13px' }}>
                          {interestedInitials.join(' ')}
                        </span>
                      ) : (
                        '—'
                      )}
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
