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
              width: '100%',
              boxSizing: 'border-box',
              display: toast.actionLabel ? 'flex' : 'block',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              textAlign: toast.actionLabel ? 'left' : 'center',
            }}
          >
            <span style={{ flex: 1 }}>{toast.message}</span>
            {toast.actionLabel && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toast.onAction?.()
                  onRemove(toast.id)
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '4px',
                  color: '#FFFEFA',
                  fontFamily: "'Caveat', cursive",
                  fontSize: '16px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontStyle: 'normal',
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </Motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
