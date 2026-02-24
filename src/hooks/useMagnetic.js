import { useRef, useEffect } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

const ACTIVATION_RADIUS = 150
const MAX_DISPLACEMENT = 12

/**
 * Magnetic hover effect — element subtly pulls toward cursor on desktop.
 * Uses framer-motion MotionValues (no React re-renders on mouse move).
 * Returns { ref, x, y } where x and y are spring-animated MotionValues.
 */
export function useMagnetic() {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { damping: 20, stiffness: 300 })
  const springY = useSpring(y, { damping: 20, stiffness: 300 })

  useEffect(() => {
    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!isDesktop) return

    const handleMouseMove = (e) => {
      const el = ref.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distX = e.clientX - centerX
      const distY = e.clientY - centerY
      const distance = Math.sqrt(distX * distX + distY * distY)

      if (distance < ACTIVATION_RADIUS && distance > 0) {
        const strength = (1 - distance / ACTIVATION_RADIUS) * MAX_DISPLACEMENT
        x.set((distX / distance) * strength)
        y.set((distY / distance) * strength)
      } else {
        x.set(0)
        y.set(0)
      }
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [x, y])

  return { ref, x: springX, y: springY }
}
