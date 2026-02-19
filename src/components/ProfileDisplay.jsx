/**
 * Shared profile display component (read-only)
 * Used by Friend View (FriendProfile.jsx)
 * My Corner Profile is an edit form, so it doesn't use this component
 *
 * @param {object} profile - Profile data object
 * @param {string} title - Display title (e.g., "Sarah's Profile")
 */
export const ProfileDisplay = ({ profile, title }) => {
  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
        Profile not found
      </div>
    )
  }

  const fieldStyle = {
    padding: '10px 12px',
    background: '#F5F1EB',
    borderRadius: '3px',
    fontSize: '15px'
  }

  const multiLineFieldStyle = {
    ...fieldStyle,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '12px', textAlign: 'center' }}>
        {title}
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
                objectPosition: profile.profile_photo_position || '50% 50%',
                border: 'none',
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
          <div style={fieldStyle}>
            {profile.display_name || 'Not provided'}
          </div>
        </div>

        {/* Location */}
        {profile.location && (
          <div className="form-group">
            <label className="form-label">Location</label>
            <div style={fieldStyle}>
              {profile.location}
            </div>
          </div>
        )}

        {/* Bio/Interests */}
        {profile.bio && (
          <div className="form-group">
            <label className="form-label">About / Interests</label>
            <div style={multiLineFieldStyle}>
              {profile.bio}
            </div>
          </div>
        )}

        {/* Favorite Books */}
        {profile.favorite_books && (
          <div className="form-group">
            <label className="form-label">Favorite Books</label>
            <div style={fieldStyle}>
              {profile.favorite_books}
            </div>
          </div>
        )}

        {/* Favorite Artists */}
        {profile.favorite_artists && (
          <div className="form-group">
            <label className="form-label">Favorite Artists</label>
            <div style={fieldStyle}>
              {profile.favorite_artists}
            </div>
          </div>
        )}

        {/* Astro Sign */}
        {profile.astro_sign && (
          <div className="form-group">
            <label className="form-label">Astro Sign</label>
            <div style={fieldStyle}>
              {profile.astro_sign}
            </div>
          </div>
        )}

        {/* Spirit Animal */}
        {profile.spirit_animal && (
          <div className="form-group">
            <label className="form-label">Spirit Animal</label>
            <div style={fieldStyle}>
              {profile.spirit_animal}
            </div>
          </div>
        )}

        {/* Favorite Quote */}
        {profile.favorite_quote && (
          <div className="form-group">
            <label className="form-label">Favorite Quote or Saying</label>
            <div style={{ ...multiLineFieldStyle, fontStyle: 'italic' }}>
              {profile.favorite_quote}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
