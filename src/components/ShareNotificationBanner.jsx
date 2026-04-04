import { createPortal } from 'react-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'

export const ShareNotificationBanner = ({ notification, onTap, onDismiss }) => {
  return createPortal(
    <AnimatePresence>
      {notification && (
        <Motion.div
          key="share-banner"
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={onTap}
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            left: '16px',
            right: '16px',
            zIndex: 10001,
            background: '#622722',
            color: '#FFFEFA',
            borderRadius: '10px',
            padding: '14px 16px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: "'Source Serif 4', Georgia, serif",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              opacity: 0.7,
              marginBottom: '2px',
            }}>
              New Share
            </div>
            <div style={{
              fontSize: '15px',
              fontStyle: 'italic',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {notification.title}
            </div>
          </div>

          <button
            onClick={onTap}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              color: '#FFFEFA',
              fontFamily: "'Caveat', cursive",
              fontSize: '18px',
              fontWeight: 600,
              padding: '6px 16px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Review
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0 4px',
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </Motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
