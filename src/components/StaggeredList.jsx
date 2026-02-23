import { motion as Motion } from 'framer-motion'

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
}

/**
 * Wraps a list container to stagger children's entrance.
 * Each direct child should be a <StaggerItem>.
 * Only animates on mount — scrolling/re-renders don't re-trigger.
 */
export const StaggeredList = ({ children, style, className }) => (
  <Motion.div
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    style={style}
    className={className}
  >
    {children}
  </Motion.div>
)

/**
 * Wraps an individual list item for cascade entrance.
 * Uses a wrapper div so it doesn't conflict with CSS transforms on the child.
 */
export const StaggerItem = ({ children }) => (
  <Motion.div variants={itemVariants}>
    {children}
  </Motion.div>
)
