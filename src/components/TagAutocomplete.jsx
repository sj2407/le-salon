import { useState, useRef, useEffect } from 'react'
import { TAG_OPTIONS, TAG_ICONS, TAG_LABELS } from '../lib/reviewConstants'

export const TagAutocomplete = ({ value, onChange, style }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Filter options based on query text
  const filtered = query.trim()
    ? TAG_OPTIONS.filter(t =>
        TAG_LABELS[t].toLowerCase().includes(query.toLowerCase())
      )
    : TAG_OPTIONS

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selectTag = (tag) => {
    onChange(tag)
    setQuery('')
    setOpen(false)
    setHighlightIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        selectTag(filtered[highlightIndex])
      } else if (filtered.length === 1) {
        selectTag(filtered[0])
      }
    }
  }

  const displayValue = open ? query : `${TAG_ICONS[value]} ${TAG_LABELS[value]}`

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value)
          setHighlightIndex(-1)
          if (!open) setOpen(true)
        }}
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type to search..."
        autoComplete="off"
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1px solid #ccc',
          borderRadius: '3px',
          background: '#FFFEFA',
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: '16px',
          fontStyle: 'italic',
          boxSizing: 'border-box'
        }}
      />

      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#FFFEFA',
          borderRadius: '0 0 4px 4px',
          boxShadow: '2px 3px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {filtered.map((tag, i) => (
            <div
              key={tag}
              onClick={() => selectTag(tag)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: '15px',
                fontStyle: 'italic',
                background: i === highlightIndex ? '#F5F0EB' : tag === value ? '#F5F0EB' : 'transparent',
                transition: 'background 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F5F0EB'
                setHighlightIndex(i)
              }}
              onMouseLeave={(e) => {
                if (tag !== value) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: '16px' }}>{TAG_ICONS[tag]}</span>
              <span>{TAG_LABELS[tag]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
