import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ProfileDisplay } from './ProfileDisplay'

export const FriendProfile = ({ friendId, friendName }) => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (friendId) {
      fetchFriendProfile()
    }
  }, [friendId])

  const fetchFriendProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', friendId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading profile...</div>
      </div>
    )
  }

  return (
    <ProfileDisplay
      profile={profile}
      title={`${friendName}'s Profile`}
    />
  )
}
