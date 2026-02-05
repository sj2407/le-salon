import { useState, useRef, useEffect } from 'react'

// Module-level variable to track currently playing audio
let currentlyPlayingAudio = null

export const MusicEntryDisplay = ({ entry }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => setIsPlaying(false)
    const handleError = () => {
      setHasError(true)
      setIsPlaying(false)
      setIsLoading(false)
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [])

  // Fetch fresh preview URL from Deezer using track ID
  const fetchFreshPreviewUrl = (trackId) => {
    return new Promise((resolve, reject) => {
      const callbackName = `deezer_track_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const script = document.createElement('script')
      script.src = `https://api.deezer.com/track/${trackId}?output=jsonp&callback=${callbackName}`

      const timeout = setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName]
          if (script.parentNode) script.parentNode.removeChild(script)
          reject(new Error('Timeout'))
        }
      }, 5000)

      window[callbackName] = (data) => {
        clearTimeout(timeout)
        delete window[callbackName]
        if (script.parentNode) script.parentNode.removeChild(script)

        if (data && data.preview) {
          resolve(data.preview)
        } else {
          reject(new Error('No preview available'))
        }
      }

      script.onerror = () => {
        clearTimeout(timeout)
        delete window[callbackName]
        if (script.parentNode) script.parentNode.removeChild(script)
        reject(new Error('Failed to fetch'))
      }

      document.body.appendChild(script)
    })
  }

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || hasError || isLoading) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      // Stop any other playing audio
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
        currentlyPlayingAudio.pause()
      }

      // If we have a track ID, fetch fresh URL
      if (entry.itunes_track_id) {
        setIsLoading(true)
        try {
          const freshUrl = await fetchFreshPreviewUrl(entry.itunes_track_id)
          audio.src = freshUrl
          currentlyPlayingAudio = audio
          await audio.play()
          setIsPlaying(true)
        } catch (err) {
          setHasError(true)
        } finally {
          setIsLoading(false)
        }
      } else {
        // Fallback to stored URL
        currentlyPlayingAudio = audio
        audio.play().catch(() => setHasError(true))
        setIsPlaying(true)
      }
    }
  }

  // Fallback to text display if no track ID and no preview URL
  if (!entry.itunes_track_id && !entry.itunes_preview_url) {
    return <span>{entry.content}</span>
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 0',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* Artwork */}
      {entry.itunes_artwork_url ? (
        <img
          src={entry.itunes_artwork_url}
          alt=""
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '4px',
            objectFit: 'cover',
            border: '1px solid #E0E0E0',
            flexShrink: 0
          }}
          onError={(e) => (e.target.style.display = 'none')}
        />
      ) : (
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          background: '#F5F1EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0
        }}>
          🎵
        </div>
      )}

      {/* Track info - constrained width */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%'
        }}>
          {entry.content || entry.itunes_artist_name}
        </div>
      </div>

      {/* Play button */}
      <button
        onClick={togglePlay}
        disabled={hasError || isLoading}
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: '1px solid #2C2C2C',
          background: isPlaying ? '#2C2C2C' : '#FFFEFA',
          color: isPlaying ? '#FFFEFA' : '#2C2C2C',
          cursor: (hasError || isLoading) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          transition: 'all 0.2s',
          opacity: hasError ? 0.5 : 1,
          flexShrink: 0,
          padding: 0
        }}
        title={hasError ? 'Preview unavailable' : (isLoading ? 'Loading...' : (isPlaying ? 'Pause' : 'Play preview'))}
      >
        {hasError ? '!' : (isLoading ? '...' : (isPlaying ? '⏸' : '▶'))}
      </button>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={entry.itunes_preview_url}
        preload="none"
        playsInline
      />
    </div>
  )
}
