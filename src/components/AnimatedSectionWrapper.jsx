import { motion as Motion } from 'framer-motion'
import { useMagnetic } from '../hooks/useMagnetic'

/**
 * Wraps a card section on friend view with magnetic hover pull (desktop only).
 * Uses framer-motion MotionValues — no React re-renders, smooth 60fps.
 * The inner section-box keeps all its existing CSS (sway, hover, tape).
 */
export const AnimatedSectionWrapper = ({ children }) => {
  const { ref, x, y } = useMagnetic()

  return (
    <Motion.div ref={ref} style={{ x, y }}>
      {children}
    </Motion.div>
  )
}
