import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'

const DEFAULT_INTERVAL = 2500

// Cross-fades through an ordered set of screenshots with a caption per frame.
// Reusable in: onboarding (Share Extension demo) and Help (Replay tour).
//
// Props:
//   frames    . [{ src, caption }, ...]
//   frame     . 'phone' wraps in a built-in bezel mock, 'borderless' renders bare
//   advance   . 'auto' | 'tap' | 'both'
//   intervalMs. auto-advance interval (default 3500). Pauses on press/hold.
//   onComplete. fired once after the last frame's auto-interval elapses
export const ScreenshotSequence = ({
  frames,
  frame: frameKind = 'borderless',
  advance = 'auto',
  intervalMs = DEFAULT_INTERVAL,
  onComplete,
  WrapperComponent,
}) => {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const completedRef = useRef(false)
  const total = frames?.length || 0

  useEffect(() => {
    if (advance === 'tap') return
    if (paused) return
    if (total === 0) return
    const timer = setTimeout(() => {
      if (index < total - 1) {
        setIndex(i => i + 1)
      } else if (!completedRef.current) {
        completedRef.current = true
        onComplete?.()
      }
    }, intervalMs)
    return () => clearTimeout(timer)
  }, [index, paused, advance, intervalMs, total, onComplete])

  if (!total) return null
  const current = frames[index]

  const handleTap = () => {
    if (advance === 'auto') return
    if (index < total - 1) {
      setIndex(i => i + 1)
    } else if (!completedRef.current) {
      completedRef.current = true
      onComplete?.()
    }
  }

  const image = (
    <div
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
      onClick={advance === 'auto' ? undefined : handleTap}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: advance === 'auto' ? 'default' : 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <AnimatePresence>
        <Motion.img
          key={current.src}
          src={current.src}
          alt={current.caption || ''}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      </AnimatePresence>
    </div>
  )

  const wrapped = WrapperComponent ? <WrapperComponent>{image}</WrapperComponent>
    : frameKind === 'phone' ? <DefaultPhoneWrap>{image}</DefaultPhoneWrap>
    : image

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      {wrapped}
      <AnimatePresence mode="wait">
        <Motion.div
          key={current.caption}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          style={{
            fontSize: '15px',
            color: '#2C2C2C',
            textAlign: 'center',
            maxWidth: '320px',
            lineHeight: 1.5,
            minHeight: '44px',
          }}
        >
          {current.caption}
        </Motion.div>
      </AnimatePresence>
      <div style={{ display: 'flex', gap: '6px' }}>
        {frames.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              completedRef.current = false
              setIndex(i)
            }}
            aria-label={`Go to frame ${i + 1}`}
            style={{
              width: '14px',
              height: '14px',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: i === index ? '#622722' : 'rgba(98,39,34,0.25)',
                transition: 'background 0.25s ease',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

// Fallback phone-frame wrapper used when `frame='phone'` and no custom Wrapper is passed.
// Kept tiny so the consumer can pass their own bezel via WrapperComponent if needed.
const DefaultPhoneWrap = ({ children }) => (
  <div style={{
    width: '240px',
    aspectRatio: '9 / 19',
    background: '#1a1a1a',
    borderRadius: '34px',
    padding: '8px',
    boxShadow: '0 14px 30px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.12)',
  }}>
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: '26px',
      overflow: 'hidden',
      background: '#000',
    }}>
      {children}
    </div>
  </div>
)
