import { useState, useRef, useEffect, useMemo, useCallback } from 'react'

/**
 * Compact inline reading graph — shows theme pills (left) connected
 * via animated SVG Bezier curves to book dots (right).
 * Max height ~140px. Clickable → opens ReadingDetailModal.
 */
export const ReadingGraphCompact = ({ books, readingGraph, onClick }) => {
  if (!readingGraph?.themes || !readingGraph?.edges) return null
  const { themes, edges } = readingGraph
  const [positions, setPositions] = useState(null)
  const containerRef = useRef(null)

  // Filter to books that appear in the graph
  const graphBooks = useMemo(() => {
    const bookIds = new Set(edges.map(e => e.book_id))
    return books.filter(b => bookIds.has(b.id)).slice(0, 6)
  }, [books, edges])

  // Sort themes by edge count, limit to 4
  const sortedThemes = useMemo(() => {
    const counts = {}
    themes.forEach(t => {
      counts[t.id] = edges.filter(e => e.theme_id === t.id).length
    })
    return [...themes]
      .sort((a, b) => counts[b.id] - counts[a.id])
      .slice(0, 4)
  }, [themes, edges])

  // Measure positions for SVG curve endpoints
  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pos = { themes: {}, books: {} }

    el.querySelectorAll('[data-cg-theme]').forEach(node => {
      const id = node.dataset.cgTheme
      const r = node.getBoundingClientRect()
      pos.themes[id] = {
        x: r.right - rect.left + 4,
        y: r.top + r.height / 2 - rect.top
      }
    })

    el.querySelectorAll('[data-cg-book]').forEach(node => {
      const id = node.dataset.cgBook
      const r = node.getBoundingClientRect()
      pos.books[id] = {
        x: r.left - rect.left - 4,
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


  // Filter edges to only those connecting visible themes & books
  const visibleEdges = useMemo(() => {
    const themeIds = new Set(sortedThemes.map(t => t.id))
    const bookIds = new Set(graphBooks.map(b => b.id))
    return edges.filter(e => themeIds.has(e.theme_id) && bookIds.has(e.book_id))
  }, [edges, sortedThemes, graphBooks])

  if (sortedThemes.length === 0 || graphBooks.length === 0) return null

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        cursor: 'pointer',
        padding: '12px 0',
        maxHeight: '140px',
        overflow: 'hidden',
      }}
    >
      {/* Theme pills — left side */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0,
        width: '38%',
        paddingTop: '4px',
      }}>
        {sortedThemes.map(theme => (
          <span
            key={theme.id}
            data-cg-theme={theme.id}
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '14px',
              background: '#E8DCC8',
              fontSize: '11px',
              color: '#2C2C2C',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              alignSelf: 'flex-start',
            }}
          >
            {theme.label}
          </span>
        ))}
      </div>

      {/* SVG curves — middle */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {positions && visibleEdges.map((edge, i) => {
          const from = positions.themes[edge.theme_id]
          const to = positions.books[edge.book_id]
          if (!from || !to) return null

          const midX = (from.x + to.x) / 2
          const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`

          return (
            <path
              key={`${edge.theme_id}-${edge.book_id}`}
              d={d}
              fill="none"
              stroke="#C5B89C"
              strokeWidth="1"
              strokeDasharray="200"
              strokeDashoffset="200"
              style={{
                animation: `graphDraw 1.5s ease-out ${i * 0.1}s forwards`,
                opacity: 0.6,
              }}
            />
          )
        })}
      </svg>

      {/* Book dots — right side */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginLeft: 'auto',
        flexShrink: 0,
        width: '30%',
        alignItems: 'flex-end',
        paddingTop: '4px',
      }}>
        {graphBooks.map(book => (
          <div
            key={book.id}
            data-cg-book={book.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexDirection: 'row-reverse',
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#622722',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '10px',
              color: '#6B6156',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100px',
            }}>
              {book.title}
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}
