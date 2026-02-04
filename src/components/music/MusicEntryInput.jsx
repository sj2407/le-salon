import { useState } from 'react'
import { ITunesSearch } from './iTunesSearch'

export const MusicEntryInput = ({ value, metadata, onChange, onRemove, placeholder }) => {
  const [showSearch, setShowSearch] = useState(false)

  const handleSelect = (track) => {
    const displayValue = `${track.trackName} - ${track.artistName}`
    onChange(displayValue, {
      itunes_track_id: track.trackId,
      itunes_preview_url: track.previewUrl,
      itunes_artist_name: track.artistName,
      itunes_album_name: track.albumName,
      itunes_artwork_url: track.artworkUrl
    })
  }

  const handleTextChange = (e) => {
    // When user types manually, clear any iTunes metadata
    onChange(e.target.value, null)
  }

  const hasItunesData = metadata?.itunes_preview_url

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder || 'Song - Artist'}
          style={{
            width: '100%',
            paddingRight: hasItunesData ? '30px' : '12px'
          }}
        />
        {hasItunesData && (
          <span
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '14px'
            }}
            title="Has audio preview"
          >
            🎵
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowSearch(true)}
        style={{
          padding: '8px 12px',
          background: '#F5F1EB',
          border: '1.5px solid #2C2C2C',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '13px',
          whiteSpace: 'nowrap'
        }}
      >
        Search
      </button>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#999',
            padding: '4px'
          }}
        >
          ×
        </button>
      )}

      <ITunesSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleSelect}
        initialQuery={value}
      />
    </div>
  )
}
