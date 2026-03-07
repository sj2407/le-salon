import { useState, useRef, useEffect } from 'react'
import { jsonpFetch } from '../../lib/coverSearchApis'

// Module-level: only one track plays at a time across all instances
let currentlyPlayingAudio = null

/**
 * Small play button for Spotify top tracks.
 * Searches Deezer JSONP on first play, caches result for repeat plays.
 * Same pattern as MusicEntryDisplay.jsx but decoupled from Card data model.
 */
export const TrackPreviewButton = ({ trackName, artistName }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [deezerPreviewUrl, setDeezerPreviewUrl] = useState(null)
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

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || hasError || isLoading) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    // Stop any other playing audio
    if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
      currentlyPlayingAudio.pause()
    }

    // If we already have a preview URL, just play it
    if (deezerPreviewUrl) {
      currentlyPlayingAudio = audio
      audio.src = deezerPreviewUrl
      try {
        await audio.play()
        setIsPlaying(true)
      } catch {
        setHasError(true)
      }
      return
    }

    // Search Deezer for this track
    setIsLoading(true)
    try {
      const query = encodeURIComponent(`${trackName} ${artistName}`)
      const data = await jsonpFetch(
        `https://api.deezer.com/search?q=${query}&limit=1&output=jsonp`
      )
      const track = data?.data?.[0]
      if (!track?.preview) {
        setHasError(true)
        return
      }

      setDeezerPreviewUrl(track.preview)
      audio.src = track.preview
      currentlyPlayingAudio = audio
      await audio.play()
      setIsPlaying(true)
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={togglePlay}
        disabled={hasError || isLoading}
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: '1px solid #622722',
          background: isPlaying ? '#622722' : '#FFFEFA',
          color: isPlaying ? '#FFFEFA' : '#622722',
          cursor: (hasError || isLoading) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          transition: 'all 0.2s',
          opacity: hasError ? 0.5 : 1,
          flexShrink: 0,
          padding: 0,
        }}
        title={hasError ? 'Preview unavailable' : (isLoading ? 'Loading...' : (isPlaying ? 'Pause' : 'Play preview'))}
      >
        {hasError ? '!' : (isLoading ? '...' : (isPlaying ? '\u23F8' : '\u25B6'))}
      </button>
      <audio ref={audioRef} preload="none" playsInline />
    </>
  )
}
