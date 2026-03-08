import { useState, useEffect, useRef } from 'react'
import { PortraitModal } from './PortraitModal'

/**
 * Creation Archive — all past creations in reverse chronological order.
 * Owner sees all (visible + hidden). Friend view: only visible items.
 * Owner actions: eye icon (hide/show) + ··· overflow menu (Edit, Delete).
 */
export const CreationArchiveModal = ({ isOpen, onClose, creations, isOwner, onToggleVisibility, onDelete, onEdit }) => {
  const [expandedId, setExpandedId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  // Close overflow menu on outside click / Escape
  useEffect(() => {
    if (openMenuId === null) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openMenuId])

  // Reset menu when modal closes
  useEffect(() => {
    if (!isOpen) setOpenMenuId(null)
  }, [isOpen])

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title="All Creations" maxWidth="480px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {creations.map(creation => (
          <div
            key={creation.id}
            style={{
              padding: '12px',
              paddingBottom: isOwner ? '16px' : '12px',
              borderRadius: '10px',
              background: '#F5F1EB',
              opacity: creation.is_visible ? 1 : 0.55,
              position: 'relative',
            }}
          >
            {/* ··· overflow menu — top right, 3D pill (matches Wishlist) */}
            {isOwner && (
              <div
                ref={openMenuId === creation.id ? menuRef : null}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  zIndex: 4,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setOpenMenuId(openMenuId === creation.id ? null : creation.id)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'radial-gradient(circle at 35% 30%, #fff, #f5f1eb 60%, #e8e2d8)',
                    color: '#888',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.25), 0 6px 14px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.6)',
                    padding: 0,
                  }}
                  aria-label="Actions"
                >
                  ⋯
                </button>
                {openMenuId === creation.id && (
                  <div onClick={(e) => e.stopPropagation()} style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    background: '#FFFEFA',
                    borderRadius: '4px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                    padding: '4px 0',
                    minWidth: '100px',
                    zIndex: 10,
                  }}>
                    {onEdit && (
                      <button
                        onClick={() => { onEdit(creation); setOpenMenuId(null) }}
                        style={{
                          display: 'block',
                          width: '100%',
                          background: 'none',
                          border: 'none',
                          padding: '8px 16px',
                          fontSize: '14px',
                          color: '#2C2C2C',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this creation?')) {
                            onDelete(creation.id)
                            setOpenMenuId(null)
                          }
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          background: 'none',
                          border: 'none',
                          padding: '8px 16px',
                          fontSize: '14px',
                          color: '#C75D5D',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Eye icon — bottom right */}
            {isOwner && onToggleVisibility && (
              <button
                onClick={() => onToggleVisibility(creation.id, !creation.is_visible)}
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '2px',
                  lineHeight: 1,
                  zIndex: 4,
                }}
                title={creation.is_visible ? 'Hide from friends' : 'Show to friends'}
              >
                {creation.is_visible ? '👁️' : '👁️‍🗨️'}
              </button>
            )}

            {/* Title */}
            {creation.title && (
              <div style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#2C2C2C',
                fontStyle: 'italic',
                marginBottom: '6px',
                paddingRight: isOwner ? '60px' : 0,
              }}>
                {creation.title}
              </div>
            )}

            {/* Text content */}
            {creation.type === 'text' && creation.text_content && (
              <p style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#2C2C2C',
                whiteSpace: 'pre-wrap',
                fontFamily: 'Source Serif 4, Georgia, serif',
              }}>
                {expandedId === creation.id
                  ? creation.text_content
                  : creation.text_content.length > 200
                    ? creation.text_content.slice(0, 200) + '...'
                    : creation.text_content
                }
                {creation.text_content.length > 200 && expandedId !== creation.id && (
                  <button
                    onClick={() => setExpandedId(creation.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#4A7BA7',
                      fontSize: '13px',
                      padding: '0 0 0 4px',
                    }}
                  >
                    more
                  </button>
                )}
              </p>
            )}

            {/* Image content — full size */}
            {creation.type === 'image' && creation.image_url && (
              <img
                src={creation.image_url}
                alt={creation.title || 'Creation'}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  display: 'block',
                }}
              />
            )}

            {/* Footer: date */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '11px', color: '#999' }}>
                {formatDate(creation.created_at)}
              </div>
            </div>
          </div>
        ))}

        {creations.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontSize: '14px' }}>
            No creations yet
          </div>
        )}
      </div>
    </PortraitModal>
  )
}
