import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Shared modal wrapper for all Portrait modals.
 * Handles: portal, backdrop, escape key, click-outside, scroll lock, framer-motion.
 * Respects prefers-reduced-motion globally.
 */
export const PortraitModal = ({ isOpen, onClose, title, children, maxWidth = '480px' }) => {
  const backdropRef = useRef(null)

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose()
  }

  // Check reduced motion
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const backdropVariants = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }

  const contentVariants = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 30, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 20, scale: 0.97 },
      }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          onClick={handleBackdropClick}
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <motion.div
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: '#FFFEFA',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth,
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              flexShrink: 0,
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2C' }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '4px 8px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Body — scrollable */}
            <div style={{
              overflowY: 'auto',
              padding: '16px 20px 20px',
              flex: 1,
            }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
