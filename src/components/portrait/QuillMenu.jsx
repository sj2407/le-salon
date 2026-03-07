import { useState } from 'react'

/**
 * Shared quill edit menu — positioned absolute at top-left of parent section.
 * Parent must have position: relative.
 *
 * @param {Array<{label: string, onClick: () => void, color?: string}>} items
 */
export const QuillMenu = ({ items }) => {
  const [open, setOpen] = useState(false)

  if (!items || items.length === 0) return null

  return (
    <div style={{ position: 'absolute', top: '-6px', left: '-6px', zIndex: 15 }}>
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          opacity: open ? 0.8 : 0.5,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.opacity = '0.5' }}
      >
        <img
          src="/images/quill-ready.png"
          alt="Edit"
          style={{ width: '24px', height: '24px', objectFit: 'contain', pointerEvents: 'none' }}
        />
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 14 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: '#FFFEFA',
            borderRadius: '4px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            padding: '4px 0',
            zIndex: 16,
            minWidth: '180px',
          }}>
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { setOpen(false); item.onClick() }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: item.color || '#2C2C2C',
                  textAlign: 'left',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
