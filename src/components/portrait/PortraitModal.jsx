import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useScrollLock } from '../../hooks/useScrollLock'
import ModalViewport from '../ModalViewport'

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

  // Scroll lock — targets .app-scroll-content (the real scrollable container)
  useScrollLock(isOpen)

  // No click-outside-to-close — user must use × or Cancel to dismiss

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
          onClick={undefined}
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            touchAction: 'none',
          }}
        >
          <ModalViewport>
          <motion.div
            data-modal
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
              maxHeight: '85%',
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
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
            }}>
              {children}
            </div>
          </motion.div>
          </ModalViewport>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
