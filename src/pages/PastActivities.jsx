import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { ActivityCard } from '../components/ActivityCard'

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
          .select('id, display_name, username, profile_photo_url')
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

  const getInterestedUsers = (activityId) => {
    const activityInterests = interests[activityId] || []
    return activityInterests
      .map((interest) => profiles[interest.user_id])
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
    <div className="container" style={{ maxWidth: '720px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              poster={profiles[activity.user_id]}
              interestedUsers={getInterestedUsers(activity.id)}
              isUserInterested={false}
              isOwner={false}
              onToggleInterest={null}
              onEdit={null}
              onDelete={null}
              isPast={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
