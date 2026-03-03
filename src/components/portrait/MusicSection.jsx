import { useState } from 'react'

const LISTENING_MODE_LABELS = {
  immersion: 'Deep listener',
  explorer: 'Explorer',
  balanced: 'Balanced ear',
}

/**
 * Music section — mood line, artist chips, listening mode, cultural geography.
 * Empty state prompts Spotify connection.
 */
export const MusicSection = ({ spotifyProfile, onSeeAll, isOwner }) => {
  const [hoveredChip, setHoveredChip] = useState(null)

  // Empty state
  if (!spotifyProfile || !spotifyProfile.is_active) {
    if (!isOwner) return null
    return (
      <div style={{
        background: '#FFFEFA',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '2px 3px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>{'\ud83c\udfb5'}</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2C' }}>Music</h3>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
          Connect Spotify to discover your musical identity.
        </p>
      </div>
    )
  }

  const { mood_line, top_artists, listening_mode, cultural_geography } = spotifyProfile

  return (
    <div style={{
      background: '#FFFEFA',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '2px 3px 8px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{'\ud83c\udfb5'}</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2C' }}>Music</h3>
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#4A7BA7',
              padding: 0,
            }}
          >
            See all
          </button>
        )}
      </div>

      {/* Mood line */}
      {mood_line && (
        <p style={{
          margin: '0 0 16px 0',
          fontSize: '15px',
          color: '#666',
          fontStyle: 'italic',
          letterSpacing: '0.3px',
        }}>
          {mood_line}
        </p>
      )}

      {/* Artist chips */}
      {top_artists && top_artists.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '14px',
        }}>
          {top_artists.map((artist, i) => (
            <span
              key={i}
              onMouseEnter={() => setHoveredChip(i)}
              onMouseLeave={() => setHoveredChip(null)}
              style={{
                display: 'inline-block',
                padding: '5px 12px',
                borderRadius: '20px',
                background: '#E0D8E8',
                fontSize: '13px',
                color: '#2C2C2C',
                cursor: 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
                transform: hoveredChip === i ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: hoveredChip === i
                  ? '2px 4px 12px rgba(0,0,0,0.15)'
                  : '1px 2px 4px rgba(0,0,0,0.06)',
              }}
            >
              {artist.name}
            </span>
          ))}
        </div>
      )}

      {/* Listening mode */}
      {listening_mode && (
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '13px',
          color: '#999',
        }}>
          {LISTENING_MODE_LABELS[listening_mode] || listening_mode}
        </p>
      )}

      {/* Cultural geography */}
      {cultural_geography && cultural_geography.length > 0 && (
        <p style={{
          margin: 0,
          fontSize: '12px',
          color: '#999',
        }}>
          {cultural_geography.map(g => g.region).join(' \u00b7 ')}
        </p>
      )}
    </div>
  )
}
