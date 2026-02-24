import { useState, useEffect } from 'react'

/**
 * Renders text with a letter-by-letter handwriting reveal animation.
 * Each character fades in and rises into place sequentially, like a pen writing.
 * Duration adapts to text length (~1.2s total regardless of title length).
 */
export const CalligraphyTitle = ({ text, fontSize = 26, color = '#2C2C2C' }) => {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setRevealed(false)
    let cancelled = false
    // Double rAF: paint the hidden state first, then trigger transitions
    requestAnimationFrame(() => {
      if (cancelled) return
      requestAnimationFrame(() => {
        if (cancelled) return
        setRevealed(true)
      })
    })
    return () => { cancelled = true }
  }, [text])

  if (!text) return null

  // Adaptive delay per character: targets ~1.2s total, clamped 0.03s–0.06s
  const charDelay = Math.max(0.03, Math.min(0.06, 1.2 / text.length))

  return (
    <span
      className="handwritten"
      aria-label={text}
      style={{ fontSize: `${fontSize}px`, color }}
    >
      {text.split('').map((char, i) => (
        <span
          key={`${text}-${i}`}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'none' : 'translateY(4px)',
            transition: revealed
              ? `opacity 0.12s ease-out ${i * charDelay}s, transform 0.12s ease-out ${i * charDelay}s`
              : 'none',
            whiteSpace: char === ' ' ? 'pre' : undefined,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  )
}
