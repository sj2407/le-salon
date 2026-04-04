import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDebounce } from '../../hooks/useDebounce'
import { searchByMediaType } from '../../lib/coverSearchApis'
import { supabase } from '../../lib/supabase'
import { useNativeCamera } from '../../hooks/useNativeCamera'

/**
 * Portal-based search modal for cover images.
 * Follows the exact pattern of iTunesSearch.jsx.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} onSelect - receives { title, subtitle, imageUrl }
 * @param {string} initialQuery - pre-fill search from item title
 * @param {string} mediaType - 'book', 'album', 'movie', 'show', 'podcast'
 */
export const CoverSearchModal = ({ isOpen, onClose, onSelect, initialQuery = '', mediaType }) => {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const { pickImage } = useNativeCamera()

  const debouncedQuery = useDebounce(query, 500)

  // Reset state when modal opens
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setQuery(initialQuery)
      setResults([])
      setError('')
    }
  }

  // Trigger search when debounced query changes
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
    if (!debouncedQuery || debouncedQuery.length < 2) return

    let cancelled = false

    searchByMediaType(debouncedQuery, mediaType)
      .then(data => {
        if (cancelled) return
        setResults(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Search failed. Try again.')
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [debouncedQuery, mediaType])

  const handleSelect = (result) => {
    onSelect({
      title: result.title,
      subtitle: result.subtitle,
      imageUrl: result.imageUrl,
    })
    onClose()
  }

  const handleUpload = async () => {
    const result = await pickImage({ camera: false })
    if (!result) return

    setUploading(true)
    setError('')
    try {
      const filename = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filename, result.blob, { contentType: result.blob.type || 'image/jpeg', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(filename)

      onSelect({ title: '', subtitle: '', imageUrl: publicUrl })
      onClose()
    } catch {
      setError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  const isSquare = mediaType === 'album' || mediaType === 'podcast'
  const thumbW = 45
  const thumbH = isSquare ? 45 : 63

  const labels = {
    book: 'Search Books',
    album: 'Search Albums',
    movie: 'Search Movies',
    show: 'Search Shows',
    podcast: 'Search Podcasts',
  }

  const uploadOnly = !mediaType

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
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFEFA',
          borderRadius: '8px',
          padding: '16px',
          width: '300px',
          maxHeight: '70vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') onClose()
        }}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '12px', marginTop: 0, fontWeight: 600 }}>
          {uploadOnly ? 'Add Cover' : (labels[mediaType] || 'Search Cover')}
        </h3>

        {!uploadOnly && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            placeholder="Type to search..."
            autoFocus
            style={{
              marginBottom: '12px',
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #999',
              borderRadius: '6px',
              fontSize: '16px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        )}

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

          {/* Upload option — always visible in upload-only mode, or after search */}
          {!isLoading && (uploadOnly || query.length >= 2) && (
            <div
              onClick={handleUpload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 10px',
                borderBottom: '1px solid #f0f0f0',
                cursor: uploading ? 'wait' : 'pointer',
                color: '#622722',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: '45px',
                height: mediaType === 'album' || mediaType === 'podcast' ? '45px' : '63px',
                borderRadius: '3px',
                border: '1px dashed #C8B89C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
              }}>
                📷
              </div>
              <div style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
                {uploading ? 'Uploading...' : 'Upload your own cover'}
              </div>
            </div>
          )}



          {results.map((result) => (
            <div
              key={result.id}
              onClick={() => handleSelect(result)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {result.imageUrl ? (
                <img
                  src={result.imageUrl}
                  alt=""
                  style={{
                    width: `${thumbW}px`,
                    height: `${thumbH}px`,
                    borderRadius: '3px',
                    objectFit: 'cover',
                    background: '#eee',
                    flexShrink: 0,
                  }}
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <div style={{
                  width: `${thumbW}px`,
                  height: `${thumbH}px`,
                  borderRadius: '3px',
                  border: '1px dashed #C8B89C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: '#999',
                  flexShrink: 0,
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}>
                  No cover
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '2px',
                }}>
                  {result.title}
                </div>
                {result.subtitle && (
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {result.subtitle}
                  </div>
                )}
              </div>
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
            fontSize: '14px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  )
}
