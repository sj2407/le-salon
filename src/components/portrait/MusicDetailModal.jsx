import { PortraitModal } from './PortraitModal'

/**
 * Music "See all" modal — full artist list, genre breakdown, cultural geography.
 */
export const MusicDetailModal = ({ isOpen, onClose, spotifyProfile }) => {
  if (!spotifyProfile) return null

  const artists = spotifyProfile.top_artists || []
  const genres = spotifyProfile.top_genres || []
  const geography = spotifyProfile.cultural_geography || []

  const modeLabel = spotifyProfile.listening_mode === 'immersion' ? 'Deep listener'
    : spotifyProfile.listening_mode === 'explorer' ? 'Explorer'
    : 'Balanced'

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title="Music" maxWidth="520px">
      {/* Mood line */}
      {spotifyProfile.mood_line && (
        <div style={{
          fontSize: '16px',
          fontStyle: 'italic',
          color: '#2C2C2C',
          marginBottom: '20px',
          fontFamily: 'Source Serif 4, Georgia, serif',
        }}>
          {spotifyProfile.mood_line}
        </div>
      )}

      {/* Listening mode */}
      <div style={{
        display: 'inline-block',
        fontSize: '12px',
        color: '#777',
        background: '#F5F1EB',
        padding: '4px 10px',
        borderRadius: '12px',
        marginBottom: '20px',
      }}>
        {modeLabel}
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
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: artist.image_url ? 'none' : '#E0D8E8',
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
                      {artist.genres.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
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
                background: '#E0D8E8',
                fontSize: '13px',
                color: '#2C2C2C',
              }}>
                {g.genre}
                <span style={{ color: '#999', marginLeft: '4px', fontSize: '11px' }}>×{g.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cultural Geography */}
      {geography.length > 0 && (
        <div>
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
    </PortraitModal>
  )
}
