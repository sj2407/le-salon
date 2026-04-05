import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { ActivityCard } from '../components/ActivityCard'

export const HiddenActivities = () => {
  const { profile } = useAuth()
  const toast = useToast()
  const [activities, setActivities] = useState([])
  const [profiles, setProfiles] = useState({})
  const [interests, setInterests] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchHiddenActivities()
    }
  }, [profile])

  const fetchHiddenActivities = async () => {
    try {
      setLoading(true)

      // Step 1: Get hidden activity IDs for this user
      const { data: hidesData, error: hidesError } = await supabase
        .from('activity_hides')
        .select('activity_id')
        .eq('user_id', profile.id)

      if (hidesError) throw hidesError
      const hiddenIds = (hidesData || []).map(h => h.activity_id)

      if (hiddenIds.length === 0) {
        setActivities([])
        setLoading(false)
        return
      }

      // Step 2: Fetch those activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .in('id', hiddenIds)
        .eq('is_archived', false)
        .order('date_parsed', { ascending: true, nullsLast: true })

      if (activitiesError) throw activitiesError

      // Fetch all interests
      const activityIds = activitiesData.map(a => a.id)
      if (activityIds.length > 0) {
        const { data: interestsData, error: interestsError } = await supabase
          .from('activity_interests')
          .select('*')
          .in('activity_id', activityIds)

        if (interestsError) throw interestsError

        const interestsByActivity = {}
        interestsData.forEach((interest) => {
          if (!interestsByActivity[interest.activity_id]) {
            interestsByActivity[interest.activity_id] = []
          }
          interestsByActivity[interest.activity_id].push(interest)
        })

        const userIds = [
          ...new Set([
            ...activitiesData.map(a => a.user_id),
            ...interestsData.map(i => i.user_id)
          ])
        ]

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, username, profile_photo_url')
          .in('id', userIds)

        if (profilesError) throw profilesError

        const profilesMap = {}
        profilesData.forEach(p => { profilesMap[p.id] = p })

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

  const handleUnhide = async (activityId) => {
    // Optimistic update
    setActivities(prev => prev.filter(a => a.id !== activityId))
    try {
      const { error } = await supabase
        .from('activity_hides')
        .delete()
        .eq('user_id', profile.id)
        .eq('activity_id', activityId)

      if (error) throw error
      toast.success('Activity unhidden')
    } catch (_err) {
      fetchHiddenActivities()
      toast.error('Failed to unhide activity')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading hidden activities...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Link to="/todo" style={{ color: '#4A7BA7', fontSize: '14px', textDecoration: 'underline' }}>
          &larr; Back to current activities
        </Link>
      </div>

      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px', textAlign: 'center' }}>
        Hidden Activities
      </h1>

      {activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          No hidden activities.
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
              onUnhide={handleUnhide}
              isPast={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
