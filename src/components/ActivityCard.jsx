import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

/**
 * Shared activity card used by ToDo.jsx (active) and PastActivities.jsx (archived).
 * Action buttons are absolutely positioned overlays — they never affect base layout.
 */
export const ActivityCard = ({
  activity,
  poster,
  interestedUsers,
  isUserInterested,
  isOwner,
  onToggleInterest,
  onEdit,
  onDelete,
  isPast
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const displayName = poster?.display_name || 'Unknown'
  const initial = displayName.charAt(0).toUpperCase()
  const photoUrl = poster?.profile_photo_url

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Build metadata line: date · location, city
  const metaParts = []
  if (activity.date_text) metaParts.push(activity.date_text)
  const locationCity = [activity.location, activity.city].filter(Boolean).join(', ')
  if (locationCity) metaParts.push(locationCity)

  // Build interested names display
  let interestedText = ''
  if (interestedUsers.length > 0) {
    if (interestedUsers.length <= 3) {
      interestedText = interestedUsers.map(u => u.display_name).join(', ') + ' interested'
    } else {
      const shown = interestedUsers.slice(0, 3).map(u => u.display_name).join(', ')
      interestedText = `${shown} +${interestedUsers.length - 3} more`
    }
  }

  return (
    <div
      style={{
        background: '#FFFEFA',
        boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
        borderRadius: '2px',
        padding: '16px',
        position: 'relative',
        opacity: isPast ? 0.6 : 1
      }}
    >
      {/* Owner actions — ··· overflow menu, absolutely positioned top-right */}
      {isOwner && !isPast && onEdit && onDelete && (
        <div ref={menuRef} style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 5 }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="cover-menu-btn"
          >
            &middot;&middot;&middot;
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#FFFEFA',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              borderRadius: '4px',
              overflow: 'hidden',
              zIndex: 10,
              minWidth: '80px'
            }}>
              <button
                onClick={() => { onEdit(activity); setMenuOpen(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#2C2C2C',
                  textAlign: 'left'
                }}
              >
                Edit
              </button>
              <button
                onClick={() => { onDelete(activity.id); setMenuOpen(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#C75D5D',
                  textAlign: 'left'
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main content: image + description + metadata */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
        {activity.image_url && (
          <img
            src={activity.image_url}
            alt=""
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '4px',
              objectFit: 'cover',
              flexShrink: 0
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: '15px',
            fontWeight: 600,
            color: '#2C2C2C',
            marginBottom: '4px',
            paddingRight: isOwner && !isPast ? '40px' : 0
          }}>
            {activity.description}
          </div>
          {metaParts.length > 0 && (
            <div style={{ fontSize: '13px', color: '#777', fontStyle: 'italic', marginBottom: '2px' }}>
              {metaParts.join(' \u00B7 ')}
            </div>
          )}
          {activity.price && (
            <div style={{ fontSize: '14px', color: '#622722', fontWeight: 600 }}>
              {activity.price}
            </div>
          )}
        </div>
      </div>

      {/* Poster line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', color: '#777' }}>Posted by</span>
        <Link to={`/friend/${activity.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0
              }}
            />
          ) : (
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#E8DCC8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Caveat', cursive",
                fontSize: '14px',
                fontWeight: 600,
                color: '#2C2C2C',
                flexShrink: 0
              }}
            >
              {initial}
            </div>
          )}
          <span style={{ fontSize: '13px', color: '#777' }}>{displayName}</span>
        </Link>
      </div>

      {/* Interest row */}
      {!isPast && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {onToggleInterest && (
            <button
              onClick={() => onToggleInterest(activity.id)}
              style={{
                padding: '5px 14px',
                fontSize: '13px',
                fontFamily: "'Source Serif 4', Georgia, serif",
                background: isUserInterested ? '#622722' : '#FFFEFA',
                color: isUserInterested ? '#FFFEFA' : '#622722',
                border: isUserInterested ? '1px solid #622722' : '1px solid #D4C9B8',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isUserInterested ? "I'm interested \u2713" : "I'm interested"}
            </button>
          )}
          {interestedText && (
            <span style={{ fontSize: '12px', color: '#777', fontStyle: 'italic' }}>
              {interestedText}
            </span>
          )}
        </div>
      )}

      {/* Past mode: show interested names read-only */}
      {isPast && interestedText && (
        <div style={{ fontSize: '12px', color: '#777', fontStyle: 'italic' }}>
          {interestedText}
        </div>
      )}
    </div>
  )
}
