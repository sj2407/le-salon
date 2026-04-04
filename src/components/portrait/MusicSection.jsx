import { useState } from 'react'
import { QuillMenu } from './QuillMenu'
import { TrackPreviewButton } from './TrackPreviewButton'
import { LISTENING_MODE_LABELS } from './portraitConstants'
import { ConfirmModal } from '../ConfirmModal'

/**
 * Music section — top 3 artists, top 3 tracks, top 3 genres, mood,
 * listening mode, cultural geography. Quill edit button for disconnect.
 */
export const MusicSection = ({ spotifyProfile, onSeeAll, isOwner, onConnectSpotify, onDisconnectSpotify, connecting, error }) => {
  const [hoveredArtist, setHoveredArtist] = useState(null)
  const [confirmState, setConfirmState] = useState(null)

  // Empty state
  if (!spotifyProfile || !spotifyProfile.is_active) {
    if (!isOwner) return null

    // Connecting state — show animated indicator
    if (connecting) {
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Music</h3>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 0',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid #E8DCC8',
              borderTopColor: '#5B8C5A',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ margin: 0, fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
              Connecting to Spotify...
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
              Analyzing your listening history
            </p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </>
      )
    }

    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Music</h3>
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
            setConfirmState({
              message: 'Disconnect Spotify? Your music data will be hidden.',
              confirmText: 'Disconnect',
              destructive: true,
              onConfirm: async () => {
                onDisconnectSpotify()
              },
            })
          },
        }]} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Music</h3>
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

      {/* Cultural geography — top 3 */}
      {cultural_geography && cultural_geography.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {cultural_geography.slice(0, 3).map((g, i) => (
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

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => { await confirmState?.onConfirm(); setConfirmState(null) }}
        title="Confirm"
        message={confirmState?.message || ''}
        confirmText={confirmState?.confirmText || 'Disconnect'}
        destructive={confirmState?.destructive ?? true}
      />
    </>
  )
}
