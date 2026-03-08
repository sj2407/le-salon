import { PortraitModal } from './PortraitModal'
import { TrackPreviewButton } from './TrackPreviewButton'
import { LISTENING_MODE_LABELS } from './portraitConstants'

/**
 * Music "See all" modal — full artist list, top tracks, genre breakdown,
 * mood, listening mode, cultural geography.
 */
export const MusicDetailModal = ({ isOpen, onClose, spotifyProfile }) => {
  if (!spotifyProfile) return null

  const artists = spotifyProfile.top_artists || []
  const tracks = spotifyProfile.top_tracks || []
  const genres = spotifyProfile.top_genres || []
  const geography = spotifyProfile.cultural_geography || []

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title="Music" maxWidth="520px">
      {/* Top genres */}
      {genres.length > 0 && (
        <div style={{
          fontSize: '16px',
          fontStyle: 'italic',
          color: '#2C2C2C',
          marginBottom: '6px',
          fontFamily: 'Source Serif 4, Georgia, serif',
        }}>
          {genres.slice(0, 3).map(g => g.genre).join(' \u00b7 ')}
        </div>
      )}

      {/* Mood + listening mode */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
        {spotifyProfile.mood_label && (
          <span style={{
            display: 'inline-block',
            fontSize: '12px',
            color: '#FFFEFA',
            background: '#622722',
            padding: '3px 10px',
            borderRadius: '12px',
            fontWeight: 500,
          }}>
            {spotifyProfile.mood_label}
          </span>
        )}
        {spotifyProfile.listening_mode && (
          <span style={{
            display: 'inline-block',
            fontSize: '12px',
            color: '#666',
            background: '#F5F1EB',
            padding: '3px 10px',
            borderRadius: '12px',
          }}>
            {LISTENING_MODE_LABELS[spotifyProfile.listening_mode] || spotifyProfile.listening_mode}
          </span>
        )}
      </div>

      {/* Top Artists */}
      {artists.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Top Artists
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {artists.map((artist, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#ccc', width: '16px', textAlign: 'right', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: artist.image_url ? 'none' : '#E8DCC8',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {artist.image_url && (
                    <img src={artist.image_url} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>{artist.name}</div>
                  {artist.genres && artist.genres.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {artist.genres.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Tracks */}
      {tracks.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Top Tracks
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tracks.map((track, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#ccc', width: '16px', textAlign: 'right', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '4px',
                  background: track.album_image_url ? 'none' : '#E8DCC8',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {track.album_image_url && (
                    <img src={track.album_image_url} alt={track.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#2C2C2C',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {track.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
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
        </div>
      )}

      {/* Genres */}
      {genres.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Genres
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {genres.map((g, i) => (
              <span key={i} style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '14px',
                background: '#E8DCC8',
                fontSize: '13px',
                color: '#6B6156',
              }}>
                {g.genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cultural Geography */}
      {geography.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cultural Geography
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {geography.map((g, i) => (
              <span key={i} style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '14px',
                background: '#F5F1EB',
                fontSize: '13px',
                color: '#2C2C2C',
              }}>
                {g.region}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Time context */}
      <p style={{
        margin: 0,
        fontSize: '11px',
        color: '#ccc',
        fontStyle: 'italic',
      }}>
        Based on your last 6 months of listening
      </p>
    </PortraitModal>
  )
}
