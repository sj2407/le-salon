import { useState } from 'react'
import { QuillMenu } from './QuillMenu'
import { TrackPreviewButton } from './TrackPreviewButton'
import { LISTENING_MODE_LABELS } from './portraitConstants'

/**
 * Music section — top 3 artists, top 3 tracks, top 3 genres, mood,
 * listening mode, cultural geography. Quill edit button for disconnect.
 */
export const MusicSection = ({ spotifyProfile, onSeeAll, isOwner, onConnectSpotify, onDisconnectSpotify, error }) => {
  const [hoveredArtist, setHoveredArtist] = useState(null)

  // Empty state
  if (!spotifyProfile || !spotifyProfile.is_active) {
    if (!isOwner) return null
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>{'\ud83c\udfb5'}</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2C' }}>Music</h3>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
          Connect Spotify to discover your musical identity.
        </p>
        {onConnectSpotify && (
          <button
            onClick={onConnectSpotify}
            style={{
              padding: '10px 20px',
              background: '#5B8C5A',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Connect Spotify
          </button>
        )}
        {error && (
          <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#C75D5D' }}>
            {error}
          </p>
        )}
      </>
    )
  }

  const { mood_label, top_artists, top_tracks, top_genres, listening_mode, cultural_geography } = spotifyProfile
  const topThreeArtists = (top_artists || []).slice(0, 3)
  const topThreeGenres = (top_genres || []).slice(0, 3)
  const topThreeTracks = (top_tracks || []).slice(0, 3)

  return (
    <>
      {/* Quill edit button (owner only) */}
      {isOwner && onDisconnectSpotify && (
        <QuillMenu items={[{
          label: 'Disconnect Spotify',
          color: '#C75D5D',
          onClick: () => {
            if (confirm('Disconnect Spotify? Your music data will be hidden.')) {
              onDisconnectSpotify()
            }
          },
        }]} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
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

      {/* Top 3 genres */}
      {topThreeGenres.length > 0 && (
        <p style={{
          margin: '0 0 16px 0',
          fontSize: '15px',
          color: '#666',
          fontStyle: 'italic',
          letterSpacing: '0.3px',
          fontFamily: 'Source Serif 4, Georgia, serif',
        }}>
          {topThreeGenres.map(g => g.genre).join(' \u00b7 ')}
        </p>
      )}

      {/* Top 3 artists with images */}
      {topThreeArtists.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '14px',
          marginBottom: '16px',
        }}>
          {topThreeArtists.map((artist, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredArtist(i)}
              onMouseLeave={() => setHoveredArtist(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                flex: 1,
                cursor: 'default',
                transition: 'transform 0.15s',
                transform: hoveredArtist === i ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#F5F1EB',
                boxShadow: hoveredArtist === i
                  ? '2px 4px 12px rgba(0,0,0,0.15)'
                  : '1px 2px 6px rgba(0,0,0,0.08)',
                transition: 'box-shadow 0.15s',
              }}>
                {artist.image_url && (
                  <img
                    src={artist.image_url}
                    alt={artist.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </div>
              <span style={{
                fontSize: '12px',
                color: '#2C2C2C',
                textAlign: 'center',
                lineHeight: 1.2,
                fontWeight: 500,
                maxWidth: '80px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {artist.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top 3 tracks */}
      {topThreeTracks.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          {topThreeTracks.map((track, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 0',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '3px',
                overflow: 'hidden',
                background: '#F5F1EB',
                flexShrink: 0,
              }}>
                {track.album_image_url && (
                  <img src={track.album_image_url} alt={track.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '13px',
                  color: '#2C2C2C',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {track.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#999',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {track.artist}
                </div>
              </div>
              <TrackPreviewButton trackName={track.name} artistName={track.artist} />
            </div>
          ))}
        </div>
      )}

      {/* Mood */}
      {mood_label && (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: '#999', marginRight: '6px' }}>Mood</span>
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '12px',
            background: '#622722',
            fontSize: '12px',
            color: '#FFFEFA',
            fontWeight: 500,
          }}>
            {mood_label}
          </span>
        </div>
      )}

      {/* Listening mode */}
      {listening_mode && (
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', color: '#999', marginRight: '6px' }}>Mode</span>
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '12px',
            background: '#E8DCC8',
            fontSize: '12px',
            color: '#6B6156',
          }}>
            {LISTENING_MODE_LABELS[listening_mode] || listening_mode}
          </span>
        </div>
      )}

      {/* Cultural geography */}
      {cultural_geography && cultural_geography.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {cultural_geography.map((g, i) => (
            <span key={i} style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '12px',
              background: '#E8DCC8',
              fontSize: '13px',
              color: '#6B6156',
              fontWeight: 500,
            }}>
              {g.region}
            </span>
          ))}
        </div>
      )}
    </>
  )
}
