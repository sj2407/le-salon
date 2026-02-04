import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
    } catch (err) {
      console.error('Error fetching friend profile:', err)
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

  if (!profile) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          Profile not found
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '12px', textAlign: 'center' }}>
        {friendName}'s Profile
      </h1>

      <div className="card" style={{ border: 'none', boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)' }}>
        {/* Profile Photo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {profile.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt="Profile"
              style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #2C2C2C',
                boxShadow: '4px 4px 0 #2C2C2C',
                filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                WebkitFilter: 'contrast(1.1) saturate(1.2) brightness(1.05)'
              }}
            />
          ) : (
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              border: '3px dashed #2C2C2C',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '14px',
              fontStyle: 'italic',
              margin: '0 auto'
            }}>
              No photo
            </div>
          )}
        </div>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Name</label>
          <div style={{
            padding: '10px 12px',
            background: '#F5F1EB',
            border: '1.5px solid #2C2C2C',
            borderRadius: '3px',
            fontSize: '15px'
          }}>
            {profile.display_name || 'Not provided'}
          </div>
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">Email</label>
          <div style={{
            padding: '10px 12px',
            background: '#F5F1EB',
            border: '1.5px solid #2C2C2C',
            borderRadius: '3px',
            fontSize: '15px'
          }}>
            {profile.email || 'Not provided'}
          </div>
        </div>

        {/* Location */}
        {profile.location && (
          <div className="form-group">
            <label className="form-label">Location</label>
            <div style={{
              padding: '10px 12px',
              background: '#F5F1EB',
              border: '1.5px solid #2C2C2C',
              borderRadius: '3px',
              fontSize: '15px'
            }}>
              {profile.location}
            </div>
          </div>
        )}

        {/* Bio/Interests */}
        {profile.bio && (
          <div className="form-group">
            <label className="form-label">About / Interests</label>
            <div style={{
              padding: '10px 12px',
              background: '#F5F1EB',
              border: '1.5px solid #2C2C2C',
              borderRadius: '3px',
              fontSize: '15px',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6
            }}>
              {profile.bio}
            </div>
          </div>
        )}

        {/* Favorite Books */}
        {profile.favorite_books && (
          <div className="form-group">
            <label className="form-label">Favorite Books</label>
            <div style={{
              padding: '10px 12px',
              background: '#F5F1EB',
              border: '1.5px solid #2C2C2C',
              borderRadius: '3px',
              fontSize: '15px'
            }}>
              {profile.favorite_books}
            </div>
          </div>
        )}

        {/* Favorite Artists */}
        {profile.favorite_artists && (
          <div className="form-group">
            <label className="form-label">Favorite Artists</label>
            <div style={{
              padding: '10px 12px',
              background: '#F5F1EB',
              border: '1.5px solid #2C2C2C',
              borderRadius: '3px',
              fontSize: '15px'
            }}>
              {profile.favorite_artists}
            </div>
          </div>
        )}

        {/* Astro Sign */}
        {profile.astro_sign && (
          <div className="form-group">
            <label className="form-label">Astro Sign</label>
            <div style={{
              padding: '10px 12px',
              background: '#F5F1EB',
              border: '1.5px solid #2C2C2C',
              borderRadius: '3px',
              fontSize: '15px'
            }}>
              {profile.astro_sign}
            </div>
          </div>
        )}

        {/* Spirit Animal */}
        {profile.spirit_animal && (
          <div className="form-group">
            <label className="form-label">Spirit Animal</label>
            <div style={{
              padding: '10px 12px',
              background: '#F5F1EB',
              border: '1.5px solid #2C2C2C',
              borderRadius: '3px',
              fontSize: '15px'
            }}>
              {profile.spirit_animal}
            </div>
          </div>
        )}

        {/* Favorite Quote */}
        {profile.favorite_quote && (
          <div className="form-group">
            <label className="form-label">Favorite Quote or Saying</label>
            <div style={{
              padding: '10px 12px',
              background: '#F5F1EB',
              border: '1.5px solid #2C2C2C',
              borderRadius: '3px',
              fontSize: '15px',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontStyle: 'italic'
            }}>
              {profile.favorite_quote}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
