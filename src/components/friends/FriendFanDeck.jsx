import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'

/**
 * Fanned card deck — cards fan out to fill available width.
 * Swipe top card to cycle it to the back. Tap to visit friend.
 * Each card has a faded tarot card background (distinct per friend, cycles after 78).
 */

// 78 Rider-Waite tarot cards — Major Arcana then suits
const TAROT_CARDS = [
  '00-TheFool.jpg', '01-TheMagician.jpg', '02-TheHighPriestess.jpg',
  '03-TheEmpress.jpg', '04-TheEmperor.jpg', '05-TheHierophant.jpg',
  '06-TheLovers.jpg', '07-TheChariot.jpg', '08-Strength.jpg',
  '09-TheHermit.jpg', '10-WheelOfFortune.jpg', '11-Justice.jpg',
  '12-TheHangedMan.jpg', '13-Death.jpg', '14-Temperance.jpg',
  '15-TheDevil.jpg', '16-TheTower.jpg', '17-TheStar.jpg',
  '18-TheMoon.jpg', '19-TheSun.jpg', '20-Judgement.jpg', '21-TheWorld.jpg',
  'Cups01.jpg', 'Cups02.jpg', 'Cups03.jpg', 'Cups04.jpg', 'Cups05.jpg',
  'Cups06.jpg', 'Cups07.jpg', 'Cups08.jpg', 'Cups09.jpg', 'Cups10.jpg',
  'Cups11.jpg', 'Cups12.jpg', 'Cups13.jpg', 'Cups14.jpg',
  'Pentacles01.jpg', 'Pentacles02.jpg', 'Pentacles03.jpg', 'Pentacles04.jpg',
  'Pentacles05.jpg', 'Pentacles06.jpg', 'Pentacles07.jpg', 'Pentacles08.jpg',
  'Pentacles09.jpg', 'Pentacles10.jpg', 'Pentacles11.jpg', 'Pentacles12.jpg',
  'Pentacles13.jpg', 'Pentacles14.jpg',
  'Swords01.jpg', 'Swords02.jpg', 'Swords03.jpg', 'Swords04.jpg',
  'Swords05.jpg', 'Swords06.jpg', 'Swords07.jpg', 'Swords08.jpg',
  'Swords09.jpg', 'Swords10.jpg', 'Swords11.jpg', 'Swords12.jpg',
  'Swords13.jpg', 'Swords14.jpg',
  'Wands01.jpg', 'Wands02.jpg', 'Wands03.jpg', 'Wands04.jpg',
  'Wands05.jpg', 'Wands06.jpg', 'Wands07.jpg', 'Wands08.jpg',
  'Wands09.jpg', 'Wands10.jpg', 'Wands11.jpg', 'Wands12.jpg',
  'Wands13.jpg', 'Wands14.jpg',
]

// Base fan shape: [rotation, xRatio, yRatio]
// xRatio/yRatio are multiplied by available side space
const FAN_SHAPE = [
  [0, 0, 0],
  [8, 0.35, 0.08],
  [-7, -0.30, 0.10],
  [14, 0.65, 0.18],
  [-12, -0.58, 0.20],
  [18, 0.88, 0.28],
]

export const FriendFanDeck = ({ friends }) => {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [order, setOrder] = useState(() => friends.map((_, i) => i))
  const [dragStart, setDragStart] = useState(null)
  const [dims, setDims] = useState({ cardW: 220, cardH: 300, sideSpace: 80 })

  // Measure available space and compute card + fan dimensions
  useEffect(() => {
    function measure() {
      const el = containerRef.current
      if (!el) return
      const parentW = el.parentElement?.clientWidth || window.innerWidth
      // Card takes ~45% of available width, clamped
      const cardW = Math.max(160, Math.min(parentW * 0.42, 280))
      const cardH = cardW * 1.35
      // How much space is available on each side of the card for fanning
      const sideSpace = (parentW - cardW) / 2 - 8 // 8px safety margin
      setDims({ cardW, cardH, sideSpace: Math.max(sideSpace, 20) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const cycleToBack = useCallback(() => {
    setOrder(prev => {
      const next = [...prev]
      const top = next.shift()
      next.push(top)
      return next
    })
  }, [])

  if (friends.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 260px)'
      }}>
        <p style={{ fontStyle: 'italic', color: '#777', fontSize: '15px' }}>
          No friends yet. Start by finding some!
        </p>
      </div>
    )
  }

  const total = friends.length
  const topIndex = order[0]
  const visibleCount = Math.min(total, 6)
  const { cardW, cardH, sideSpace } = dims

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 260px)',
        userSelect: 'none',
        width: '100%'
      }}
    >
      {/* Fan area — card-sized, extra space handled by transforms */}
      <div style={{
        position: 'relative',
        width: cardW,
        height: cardH,
      }}>
        {order.slice(0, visibleCount).reverse().map((friendIdx) => {
          const isTop = friendIdx === topIndex
          const stackPos = order.indexOf(friendIdx)
          const profile = friends[friendIdx].friendProfile
          const displayName = profile.display_name
          const initial = displayName.charAt(0).toUpperCase()
          const photoUrl = profile.profile_photo_url

          const shape = FAN_SHAPE[Math.min(stackPos, FAN_SHAPE.length - 1)]
          const rotation = shape[0]
          const xOffset = shape[1] * sideSpace
          const yOffset = shape[2] * sideSpace
          const tarotCard = TAROT_CARDS[friendIdx % TAROT_CARDS.length]

          return (
            <Motion.div
              key={friendIdx}
              layout
              initial={false}
              animate={{
                x: xOffset,
                y: yOffset,
                rotate: rotation,
                scale: 1 - stackPos * 0.02,
                zIndex: 20 - stackPos
              }}
              transition={{
                type: 'spring',
                damping: 18,
                stiffness: 180
              }}
              drag={isTop ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragStart={() => setDragStart(Date.now())}
              onDragEnd={(_, info) => {
                const dist = Math.abs(info.offset.x)
                const vel = Math.abs(info.velocity.x)
                if (dist > 50 || vel > 250) cycleToBack()
                setDragStart(null)
              }}
              onClick={() => {
                if (!isTop) return
                if (dragStart && Date.now() - dragStart > 200) return
                navigate(`/friend/${profile.id}`)
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                cursor: isTop ? 'grab' : 'default',
                touchAction: 'pan-y',
                transformOrigin: 'bottom center'
              }}
              whileDrag={{ cursor: 'grabbing', scale: 1.04, rotate: 0 }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                background: '#FFFEFA',
                borderRadius: '10px',
                boxShadow: isTop
                  ? '3px 6px 20px rgba(0, 0, 0, 0.14)'
                  : '2px 3px 12px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '20px 14px',
                pointerEvents: isTop ? 'auto' : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Faded tarot card background */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url(/images/tarot/${tarotCard})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.5,
                  pointerEvents: 'none',
                  filter: 'sepia(0.4) saturate(0.85) brightness(0.95)'
                }} />
                {/* Avatar */}
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={displayName}
                    draggable={false}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: cardW * 0.38,
                      height: cardW * 0.38,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                      boxShadow: '0 0 0 3px #FFFEFA, 0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'relative',
                    zIndex: 1,
                    width: cardW * 0.38,
                    height: cardW * 0.38,
                    borderRadius: '50%',
                    background: '#E8DCC8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Cinzel Decorative', serif",
                    fontSize: cardW * 0.13,
                    fontWeight: 700,
                    color: '#2C2C2C',
                    flexShrink: 0,
                    boxShadow: '0 0 0 3px #FFFEFA, 0 2px 8px rgba(0,0,0,0.2)'
                  }}>
                    {initial}
                  </div>
                )}

                {/* Name */}
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  fontFamily: "'Cinzel Decorative', serif",
                  fontSize: Math.max(14, cardW * 0.08),
                  fontWeight: 700,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  color: '#2C2C2C',
                  maxWidth: '90%',
                  textShadow: '0 0 6px #FFFEFA, 0 0 12px #FFFEFA, 0 0 20px #FFFEFA'
                }}>
                  {displayName}
                </div>
              </div>
            </Motion.div>
          )
        })}
      </div>

      {/* Counter + hint */}
      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        color: '#999',
        fontSize: '13px'
      }}>
        <span style={{ fontWeight: 600, color: '#666' }}>
          {order.indexOf(topIndex) + 1}
        </span>
        {' / '}
        {total}
        {total > 1 && (
          <div style={{ marginTop: '4px', fontSize: '12px', fontStyle: 'italic' }}>
            swipe to browse
          </div>
        )}
      </div>
    </div>
  )
}
