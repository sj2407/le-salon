import { createPortal } from 'react-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'

const TOAST_COLORS = {
  success: '#5C6B4A',
  error: '#C75D5D',
  info: '#622722',
}

export const ToastContainer = ({ toasts, onRemove }) => {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(58px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none',
        width: '90%',
        maxWidth: '320px',
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <Motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={() => onRemove(toast.id)}
            style={{
              background: TOAST_COLORS[toast.type] || TOAST_COLORS.info,
              color: '#FFFEFA',
              padding: '10px 20px',
              borderRadius: '8px',
              fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '14px',
              lineHeight: 1.4,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {toast.message}
          </Motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
