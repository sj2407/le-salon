import { useState } from 'react'
import { PortraitModal } from './PortraitModal'

/**
 * Creation Archive — all past creations in reverse chronological order.
 * Owner sees all (visible + hidden). Friend view: only visible items.
 * Images show full-size when expanded.
 */
export const CreationArchiveModal = ({ isOpen, onClose, creations, isOwner, onToggleVisibility, onDelete }) => {
  const [expandedId, setExpandedId] = useState(null)

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
              borderRadius: '10px',
              background: '#F5F1EB',
              position: 'relative',
              opacity: creation.is_visible ? 1 : 0.55,
            }}
          >
            {/* Owner actions — absolute overlay */}
            {isOwner && (
              <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px', zIndex: 2 }}>
                <button
                  onClick={() => onToggleVisibility(creation.id, !creation.is_visible)}
                  title={creation.is_visible ? 'Hide' : 'Show'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '2px',
                    opacity: 0.6,
                  }}
                >
                  {creation.is_visible ? '\ud83d\udc41\ufe0f' : '\ud83d\udc41\ufe0f\u200d\ud83d\udde8\ufe0f'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this creation?')) {
                      onDelete(creation.id)
                    }
                  }}
                  title="Delete"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px',
                    opacity: 0.5,
                    color: '#999',
                  }}
                >
                  {'\u2715'}
                </button>
              </div>
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
                paddingRight: isOwner && !creation.title ? '60px' : 0,
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

            {/* Date */}
            <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
              {formatDate(creation.created_at)}
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
