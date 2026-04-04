import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Reusable confirmation modal — replaces browser confirm() dialogs.
 * Portal-based, framer-motion animated, escape-key dismissible, scroll-locked.
 */
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  destructive = true,
}) => {
  const [loading, setLoading] = useState(false)

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose, loading])

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

  // Reset loading when closed
  useEffect(() => {
    if (!isOpen) setLoading(false)
  }, [isOpen])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  // Reduced motion
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const backdropVariants = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }

  const contentVariants = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 20, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 10, scale: 0.97 },
      }

  const confirmColor = destructive ? '#C0392B' : '#4A7BA7'

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          onClick={() => { if (!loading) onClose() }}
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
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFEFA',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              padding: '28px 24px 20px',
              maxWidth: '360px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <h3 style={{
              margin: '0 0 12px',
              fontFamily: 'Georgia, serif',
              fontSize: '18px',
              fontWeight: 600,
              color: '#2C1810',
            }}>
              {title}
            </h3>

            <p style={{
              margin: '0 0 24px',
              fontSize: '15px',
              lineHeight: 1.5,
              color: '#5C4A3A',
            }}>
              {message}
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 20px',
                  fontSize: '15px',
                  color: '#8B7355',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: '8px',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {cancelText}
              </button>

              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  background: confirmColor,
                  border: 'none',
                  padding: '10px 24px',
                  fontSize: '15px',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: '8px',
                  fontWeight: 600,
                  minWidth: '90px',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? '...' : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
