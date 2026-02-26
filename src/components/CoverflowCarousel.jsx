import { useRef, useState, useEffect } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { TAG_ICONS } from '../lib/reviewConstants'

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #F5E6D3 0%, #E8D5C4 100%)',
  'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
  'linear-gradient(135deg, #D4C4B0 0%, #C8B89C 100%)',
  'linear-gradient(135deg, #E2D8CC 0%, #D0C4B4 100%)',
  'linear-gradient(135deg, #F0E4D4 0%, #DDD0BC 100%)',
]

// Extract URL from title, return { displayTitle, url }
const parseTitle = (title) => {
  if (!title) return { displayTitle: '', url: null }
  // "Title https://..."
  const urlAtEnd = title.match(/^(.+?)\s+(https?:\/\/[^\s]+)$/)
  if (urlAtEnd) return { displayTitle: urlAtEnd[1].trim(), url: urlAtEnd[2].trim() }
  // "Title | https://..."
  if (title.includes(' | http')) {
    const [t, u] = title.split(' | ')
    return { displayTitle: t.trim(), url: u.trim() }
  }
  // Bare URL
  if (/^https?:\/\/[^\s]+$/.test(title.trim())) {
    let domain = title.trim()
    try { domain = new URL(title.trim()).hostname.replace(/^www\./, '') } catch {}
    return { displayTitle: domain, url: title.trim() }
  }
  return { displayTitle: title, url: null }
}

// Responsive card size — ~40% of viewport width, clamped between 180–320px
const getCardWidth = () => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 375
  return Math.min(380, Math.max(216, Math.round(vw * 0.48)))
}

/**
 * 3D coverflow carousel — absolute-positioned, overlapping cards.
 * Center card faces forward, sides fan out behind it.
 */
export const CoverflowCarousel = ({ items, onToggleDone, onEdit, onDelete, onTogglePrivate }) => {
  const [activeIndex, setActiveIndex] = useState(() => Math.floor(items.length / 2))
  const [openMenuId, setOpenMenuId] = useState(null)
  const [cardW, setCardW] = useState(getCardWidth)
  const [brokenImages, setBrokenImages] = useState(new Set())
  const dragRef = useRef(null)
  const containerRef = useRef(null)
  const menuRef = useRef(null)

  const ASPECT = 1.4
  const cardH = Math.round(cardW * ASPECT)

  // Respond to window resize
  useEffect(() => {
    const onResize = () => setCardW(getCardWidth())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Clamp active index when items change
  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(Math.max(0, items.length - 1))
  }, [items.length, activeIndex])

  // Close menu on outside click / Escape
  useEffect(() => {
    if (openMenuId === null) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null)
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openMenuId])

  // Track whether the last interaction was a drag (persists past pointerUp for click handler)
  const wasDrag = useRef(false)

  // Pointer drag / swipe — skip if target is a button (let buttons handle their own clicks)
  const onPointerDown = (e) => {
    if (e.target.closest('button')) return
    wasDrag.current = false
    dragRef.current = { x: e.clientX, startIndex: activeIndex }
  }

  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    if (Math.abs(dx) > 8) wasDrag.current = true
    const shift = Math.round(-dx / (cardW * 0.6))
    const newIndex = Math.max(0, Math.min(items.length - 1, dragRef.current.startIndex + shift))
    if (newIndex !== activeIndex) setActiveIndex(newIndex)
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const handleImageError = (itemId) => {
    setBrokenImages(prev => new Set(prev).add(itemId))
  }

  if (!items || items.length === 0) return null

  // Spacing scales with card width
  const spacing = Math.round(cardW * 0.28)

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'relative',
        flex: 1,
        minHeight: `${cardH + 40}px`,
        perspective: '1200px',
        perspectiveOrigin: '50% 50%',
        margin: '0 auto',
        width: '100%',
        overflow: 'hidden',
        cursor: 'grab',
        touchAction: 'pan-y',
        userSelect: 'none',
      }}
    >
      {items.map((item, i) => {
        const offset = i - activeIndex
        const absOffset = Math.abs(offset)
        const { displayTitle, url } = parseTitle(item.title)
        const hasCover = !!item.imageUrl && !brokenImages.has(item.id)
        const isSquare = item.tag === 'album' || item.tag === 'podcast'
        const itemH = isSquare ? cardW : cardH

        // 3D transforms — cards fan out and overlap
        const translateX = offset * spacing
        const rotateY = offset * -12
        const scale = Math.max(0.7, 1 - absOffset * 0.08)
        const translateZ = -absOffset * 80
        const opacity = absOffset > 4 ? 0 : Math.max(0.3, 1 - absOffset * 0.15)
        const zIndex = items.length - absOffset

        const handleCardClick = () => {
          if (wasDrag.current) return
          if (offset !== 0) {
            setActiveIndex(i)
          } else if (url) {
            window.open(url, '_blank', 'noopener,noreferrer')
          }
        }

        return (
          <div
            key={item.id}
            onClick={handleCardClick}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${cardW}px`,
              height: `${itemH}px`,
              marginLeft: `${-cardW / 2}px`,
              marginTop: `${-itemH / 2}px`,
              transform: `translateX(${translateX}px) rotateY(${rotateY}deg) scale(${scale}) translateZ(${translateZ}px)`,
              transformStyle: 'preserve-3d',
              transition: 'transform 0.4s ease, opacity 0.4s ease',
              opacity,
              zIndex,
              borderRadius: '8px',
              overflow: 'visible',
              cursor: offset === 0 ? (url ? 'pointer' : 'default') : 'pointer',
              pointerEvents: absOffset > 4 ? 'none' : 'auto',
            }}
          >
            {/* Card body */}
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: offset === 0
                ? '0 12px 40px rgba(0, 0, 0, 0.25)'
                : '0 4px 16px rgba(0, 0, 0, 0.12)',
              background: hasCover ? '#eee' : FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length],
            }}>
              {hasCover ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  draggable={false}
                  onError={() => handleImageError(item.id)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    userSelect: 'none',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px 10px',
                  boxSizing: 'border-box',
                }}>
                  <span style={{ fontSize: '36px', marginBottom: '10px' }}>
                    {TAG_ICONS[item.tag] || '\uD83D\uDCCC'}
                  </span>
                  <div style={{
                    fontSize: '13px',
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    fontStyle: 'italic',
                    color: '#4A3728',
                    textAlign: 'center',
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word',
                  }}>
                    {displayTitle}
                  </div>
                </div>
              )}

              {/* Tag badge — cover cards only */}
              {hasCover && TAG_ICONS[item.tag] && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  fontSize: '14px',
                  background: 'rgba(255, 254, 250, 0.85)',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  {TAG_ICONS[item.tag]}
                </span>
              )}

              {/* Title overlay — cover cards only */}
              {hasCover && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  padding: '20px 10px 10px',
                }}>
                  <div style={{
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    fontStyle: 'italic',
                    fontWeight: 500,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }}>
                    {displayTitle}
                  </div>
                </div>
              )}
            </div>

            {/* Done button — empty circle, only on active card, only in owner mode */}
            {offset === 0 && onToggleDone && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleDone(item) }}
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#FFFEFA',
                  border: '1px solid #CCC',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  zIndex: 5,
                }}
                title="Mark as done"
              />
            )}

            {/* Privacy toggle — only on active card, only in owner mode */}
            {offset === 0 && onTogglePrivate && (
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePrivate(item) }}
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '12px',
                  background: '#FFFEFA',
                  border: '1px solid #CCC',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  zIndex: 5,
                }}
                title={item.isPrivate ? 'Make visible to friends' : 'Hide from friends'}
              >
                {item.isPrivate
                  ? <EyeSlash size={11} weight="duotone" color="#999" />
                  : <Eye size={11} weight="duotone" color="#7A3B2E" />
                }
              </button>
            )}

            {/* Overflow menu — only on active card, only in owner mode */}
            {offset === 0 && (onEdit || onDelete) && (
              <div
                ref={openMenuId === item.id ? menuRef : null}
                style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 10 }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === item.id ? null : item.id)
                  }}
                  style={{
                    background: 'rgba(255, 254, 250, 0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: '#666',
                    backdropFilter: 'blur(4px)',
                    padding: 0,
                  }}
                  aria-label="Actions"
                >
                  ⋯
                </button>
                {openMenuId === item.id && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    background: '#FFFEFA',
                    borderRadius: '4px',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
                    padding: '4px 0',
                    minWidth: '90px',
                    zIndex: 20,
                  }}>
                    {onEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(item); setOpenMenuId(null) }}
                        style={{
                          display: 'block',
                          width: '100%',
                          background: 'none',
                          border: 'none',
                          padding: '8px 14px',
                          fontSize: '13px',
                          color: '#2C2C2C',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); setOpenMenuId(null) }}
                        style={{
                          display: 'block',
                          width: '100%',
                          background: 'none',
                          border: 'none',
                          padding: '8px 14px',
                          fontSize: '13px',
                          color: '#C75D5D',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
