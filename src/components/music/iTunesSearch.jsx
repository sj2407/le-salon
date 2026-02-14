import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDebounce } from '../../hooks/useDebounce'

export const ITunesSearch = ({ isOpen, onClose, onSelect, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const debouncedQuery = useDebounce(query, 500)

  // Reset state when modal opens (adjust during render, not in effect)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setQuery(initialQuery)
      setResults([])
      setError('')
    }
  }

  // Adjust state when debounced query changes (during render, not in effect)
  const [prevDebouncedQuery, setPrevDebouncedQuery] = useState(debouncedQuery)
  if (prevDebouncedQuery !== debouncedQuery) {
    setPrevDebouncedQuery(debouncedQuery)
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      setIsLoading(false)
    } else {
      setIsLoading(true)
      setError('')
    }
  }

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      return
    }

    // Use Deezer API with JSONP (more reliable than iTunes)
    const callbackName = `deezer_cb_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const encodedQuery = encodeURIComponent(debouncedQuery)
    const script = document.createElement('script')
    script.src = `https://api.deezer.com/search?q=${encodedQuery}&limit=8&output=jsonp&callback=${callbackName}`

    window[callbackName] = (data) => {
      if (data.data) {
        setResults(data.data)
      } else {
        setResults([])
      }
      setIsLoading(false)
      delete window[callbackName]
      if (script.parentNode) script.parentNode.removeChild(script)
    }

    script.onerror = () => {
      setError('Search failed. Try again.')
      setIsLoading(false)
      delete window[callbackName]
      if (script.parentNode) script.parentNode.removeChild(script)
    }

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (window[callbackName]) {
        setError('Search timed out. Try again.')
        setIsLoading(false)
        delete window[callbackName]
        if (script.parentNode) script.parentNode.removeChild(script)
      }
    }, 8000)

    document.body.appendChild(script)

    return () => {
      clearTimeout(timeout)
      // Replace with no-op so late JSONP responses don't throw ReferenceError
      window[callbackName] = () => { delete window[callbackName] }
      if (script.parentNode) script.parentNode.removeChild(script)
    }
  }, [debouncedQuery])

  const handleSelect = (track) => {
    // Deezer format
    onSelect({
      trackId: track.id?.toString() || '',
      trackName: track.title || '',
      artistName: track.artist?.name || '',
      albumName: track.album?.title || '',
      previewUrl: track.preview || '',
      artworkUrl: track.album?.cover_medium || track.album?.cover || ''
    })
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFEFA',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '16px',
          width: '300px',
          maxHeight: '70vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '12px', marginTop: 0, fontWeight: 600 }}>
          Search Music
        </h3>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          placeholder="Type artist or song name..."
          autoFocus
          style={{
            marginBottom: '12px',
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #999',
            borderRadius: '6px',
            fontSize: '15px',
            boxSizing: 'border-box',
            outline: 'none'
          }}
        />

        <div style={{ flex: 1, overflowY: 'auto', minHeight: '100px', maxHeight: '300px', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#666', fontSize: '14px' }}>
              Searching...
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#c00', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {!isLoading && !error && query.length < 2 && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#888', fontSize: '14px' }}>
              Type to search...
            </div>
          )}

          {!isLoading && !error && query.length >= 2 && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#888', fontSize: '14px' }}>
              No results found
            </div>
          )}

          {results.map((track) => (
            <div
              key={track.id}
              onClick={() => {
                if (track.preview) {
                  handleSelect(track)
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                borderBottom: '1px solid #f0f0f0',
                cursor: track.preview ? 'pointer' : 'not-allowed',
                opacity: track.preview ? 1 : 0.4,
                background: track.preview ? 'transparent' : '#fafafa'
              }}
              onMouseOver={(e) => {
                if (track.preview) e.currentTarget.style.background = '#f5f5f5'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = track.preview ? 'transparent' : '#fafafa'
              }}
            >
              <img
                src={track.album?.cover_small || track.album?.cover || ''}
                alt=""
                style={{
                  width: '45px',
                  height: '45px',
                  borderRadius: '4px',
                  objectFit: 'cover',
                  background: '#eee',
                  flexShrink: 0
                }}
                onError={(e) => (e.target.src = '')}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '2px'
                }}>
                  {track.title}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {track.artist?.name}
                </div>
              </div>
              {!track.preview && (
                <span style={{ fontSize: '10px', color: '#aaa', whiteSpace: 'nowrap' }}>
                  No preview
                </span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '12px',
            padding: '10px 20px',
            background: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  )
}
