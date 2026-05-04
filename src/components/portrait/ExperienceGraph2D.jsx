import { useState, useRef, useEffect, useMemo, useCallback } from 'react'

/**
 * 2D bipartite experience graph — themes (left 1/3) connected via SVG curves
 * (middle 1/3) to experiences (right 1/3). Sibling of ReadingGraph2D, adapted
 * for live performances + exhibitions.
 */
export const ExperienceGraph2D = ({ experiences, experienceGraph }) => {
  const { themes, edges } = experienceGraph
  const [selected, setSelected] = useState(null)
  const [positions, setPositions] = useState(null)
  const containerRef = useRef(null)

  const graphRows = useMemo(() => {
    const ids = new Set(edges.map(e => e.experience_id))
    return experiences.filter(r => ids.has(r.id))
  }, [experiences, edges])

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
      return new Set(edges.filter(e => e.theme_id === selected.id).map(e => e.experience_id))
    }
    return new Set(edges.filter(e => e.experience_id === selected.id).map(e => e.theme_id))
  }, [selected, edges])

  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pos = { themes: {}, rows: {} }

    el.querySelectorAll('[data-theme-id]').forEach(node => {
      const id = node.dataset.themeId
      const r = node.getBoundingClientRect()
      pos.themes[id] = {
        x: r.right - rect.left,
        y: r.top + r.height / 2 - rect.top
      }
    })

    el.querySelectorAll('[data-experience-id]').forEach(node => {
      const id = node.dataset.experienceId
      const r = node.getBoundingClientRect()
      pos.rows[id] = {
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
  }, [sortedThemes, graphRows, measure])

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

  const isRowDimmed = (rowId) => {
    if (!selected) return false
    if (selected.type === 'experience') return selected.id !== rowId
    return !activeEdges.has(rowId)
  }

  const isEdgeActive = (themeId, rowId) => {
    if (!selected) return true
    if (selected.type === 'theme') return selected.id === themeId
    return selected.id === rowId
  }

  return (
    <div
      ref={containerRef}
      onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
      style={{ position: 'relative', width: '100%', padding: '8px 0' }}
    >
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
            const to = positions.rows[edge.experience_id]
            if (!from || !to) return null
            const theme = themes.find(t => t.id === edge.theme_id)
            const active = isEdgeActive(edge.theme_id, edge.experience_id)
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

        {/* Middle: SVG drawing space + tap-to-deselect */}
        <div onClick={() => setSelected(null)} style={{ cursor: selected ? 'pointer' : 'default' }} />

        {/* Right: Experiences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
          <div style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#9B8F82',
            fontWeight: 600,
            marginBottom: '2px',
          }}>
            Experiences
          </div>
          {graphRows.map(row => {
            const dimmed = isRowDimmed(row.id)
            const isSel = selected?.type === 'experience' && selected.id === row.id
            const subtitle = row.subcategory || (row.category === 'concert' && row.artist_name) || (row.category ? row.category : null)
            return (
              <div
                key={row.id}
                data-experience-id={row.id}
                onClick={() => handleTap('experience', row.id)}
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
                    {row.name}
                  </div>
                  {subtitle && (
                    <div style={{
                      fontSize: '9px',
                      color: '#8C8578',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {subtitle}
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
