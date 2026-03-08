import { useState, useRef, useEffect, useMemo, useCallback } from 'react'

/**
 * 2D bipartite reading graph — themes (left 1/3) connected via SVG curves (middle 1/3)
 * to books (right 1/3). Mobile-optimized replacement for the 3D Three.js graph.
 */
export const ReadingGraph2D = ({ books, readingGraph }) => {
  const { themes, edges } = readingGraph
  const [selected, setSelected] = useState(null)
  const [positions, setPositions] = useState(null)
  const containerRef = useRef(null)

  const graphBooks = useMemo(() => {
    const bookIds = new Set(edges.map(e => e.book_id))
    return books.filter(b => bookIds.has(b.id))
  }, [books, edges])

  const sortedThemes = useMemo(() => {
    const counts = {}
    themes.forEach(t => {
      counts[t.id] = edges.filter(e => e.theme_id === t.id).length
    })
    return [...themes].sort((a, b) => counts[b.id] - counts[a.id]).map(t => ({
      ...t,
      count: counts[t.id]
    }))
  }, [themes, edges])

  const activeEdges = useMemo(() => {
    if (!selected) return null
    if (selected.type === 'theme') {
      return new Set(edges.filter(e => e.theme_id === selected.id).map(e => e.book_id))
    }
    return new Set(edges.filter(e => e.book_id === selected.id).map(e => e.theme_id))
  }, [selected, edges])

  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pos = { themes: {}, books: {} }

    el.querySelectorAll('[data-theme-id]').forEach(node => {
      const id = node.dataset.themeId
      const r = node.getBoundingClientRect()
      pos.themes[id] = {
        x: r.right - rect.left,
        y: r.top + r.height / 2 - rect.top
      }
    })

    el.querySelectorAll('[data-book-id]').forEach(node => {
      const id = node.dataset.bookId
      const r = node.getBoundingClientRect()
      pos.books[id] = {
        x: r.left - rect.left,
        y: r.top + r.height / 2 - rect.top
      }
    })

    setPositions(pos)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    requestAnimationFrame(() => requestAnimationFrame(measure))
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sortedThemes, graphBooks, measure])

  const handleTap = (type, id) => {
    setSelected(prev =>
      prev && prev.type === type && prev.id === id ? null : { type, id }
    )
  }

  const isThemeDimmed = (themeId) => {
    if (!selected) return false
    if (selected.type === 'theme') return selected.id !== themeId
    return !activeEdges.has(themeId)
  }

  const isBookDimmed = (bookId) => {
    if (!selected) return false
    if (selected.type === 'book') return selected.id !== bookId
    return !activeEdges.has(bookId)
  }

  const isEdgeActive = (themeId, bookId) => {
    if (!selected) return true
    if (selected.type === 'theme') return selected.id === themeId
    return selected.id === bookId
  }

  return (
    <div
      ref={containerRef}
      onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
      style={{ position: 'relative', width: '100%', padding: '8px 0' }}
    >
      {/* SVG connection lines — full overlay, curves span the middle third */}
      {positions && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {edges.map((edge, i) => {
            const from = positions.themes[edge.theme_id]
            const to = positions.books[edge.book_id]
            if (!from || !to) return null

            const theme = themes.find(t => t.id === edge.theme_id)
            const active = isEdgeActive(edge.theme_id, edge.book_id)
            const midX = (from.x + to.x) / 2

            return (
              <path
                key={i}
                d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
                fill="none"
                stroke={theme?.color || '#D4C9B8'}
                strokeWidth={active && selected ? 2.5 : 1.5}
                opacity={active ? (selected ? 0.85 : 0.55) : 0.08}
                style={{ transition: 'opacity 0.2s, stroke-width 0.2s' }}
              />
            )
          })}
        </svg>
      )}

      {/* Grid: themes (1/3) | gap for lines (1/3) | books (1/3) */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left: Themes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#9B8F82',
            fontWeight: 600,
            marginBottom: '2px',
          }}>
            Themes
          </div>
          {sortedThemes.map(theme => {
            const dimmed = isThemeDimmed(theme.id)
            const isSel = selected?.type === 'theme' && selected.id === theme.id
            return (
              <div
                key={theme.id}
                data-theme-id={theme.id}
                onClick={() => handleTap('theme', theme.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 6px',
                  borderRadius: '10px',
                  background: isSel ? (theme.color || '#E8DCC8') : '#F5F1EB',
                  cursor: 'pointer',
                  opacity: dimmed ? 0.25 : 1,
                  transition: 'opacity 0.2s, background 0.2s',
                  border: isSel ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent',
                }}
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: theme.color || '#D4C9B8',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: '11px',
                  fontStyle: 'italic',
                  color: isSel ? '#FFF' : '#2C2C2C',
                  lineHeight: 1.3,
                  flex: 1,
                  minWidth: 0,
                  wordBreak: 'normal',
                  overflowWrap: 'break-word',
                  hyphens: 'none',
                  WebkitHyphens: 'none',
                }}>
                  {theme.label}
                </span>
                <span style={{
                  fontSize: '9px',
                  color: isSel ? 'rgba(255,255,255,0.8)' : '#9B8F82',
                  flexShrink: 0,
                }}>
                  {theme.count}
                </span>
              </div>
            )
          })}
        </div>

        {/* Middle: empty — SVG lines drawn over this space. Tap to deselect. */}
        <div onClick={() => setSelected(null)} style={{ cursor: selected ? 'pointer' : 'default' }} />

        {/* Right: Books */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
          <div style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#9B8F82',
            fontWeight: 600,
            marginBottom: '2px',
          }}>
            Books
          </div>
          {graphBooks.map(book => {
            const dimmed = isBookDimmed(book.id)
            const isSel = selected?.type === 'book' && selected.id === book.id
            return (
              <div
                key={book.id}
                data-book-id={book.id}
                onClick={() => handleTap('book', book.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 4px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  opacity: dimmed ? 0.25 : 1,
                  transition: 'opacity 0.2s, background 0.2s',
                  background: isSel ? '#F0EBE3' : 'transparent',
                }}
              >
                <div style={{
                  width: '22px',
                  height: '32px',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: book.cover_url ? 'none' : '#E8DCC8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {book.cover_url ? (
                    <img src={book.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '6px', color: '#999', textAlign: 'center', lineHeight: 1.1 }}>
                      {book.title.slice(0, 10)}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#2C2C2C',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {book.title}
                  </div>
                  {book.author && (
                    <div style={{
                      fontSize: '9px',
                      color: '#8C8578',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {book.author}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
