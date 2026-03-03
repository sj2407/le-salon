import { PortraitModal } from './PortraitModal'

/**
 * Creation Archive — all past creations in reverse chronological order.
 * Owner sees all (visible + hidden). Friend view: only visible items.
 */
export const CreationArchiveModal = ({ isOpen, onClose, creations, isOwner, onToggleVisibility, onDelete }) => {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title="Creations Archive" maxWidth="480px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {creations.map(creation => (
          <div
            key={creation.id}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '10px',
              borderRadius: '8px',
              background: '#F5F1EB',
              position: 'relative',
              opacity: creation.is_visible ? 1 : 0.55,
            }}
          >
            {/* Thumbnail or preview */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '6px',
              overflow: 'hidden',
              flexShrink: 0,
              background: creation.type === 'image' ? '#E8DCC8' : '#FFFEFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {creation.type === 'image' && creation.image_url ? (
                <img src={creation.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', padding: '4px', textAlign: 'center', lineHeight: 1.2, overflow: 'hidden' }}>
                  {(creation.text_content || '').slice(0, 40)}
                </span>
              )}
            </div>

            {/* Content preview */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {creation.title && (
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#2C2C2C', marginBottom: '2px' }}>
                  {creation.title}
                </div>
              )}
              <div style={{ fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {creation.type === 'text'
                  ? (creation.text_content || '').split('\n')[0]
                  : 'Image'}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {formatDate(creation.created_at)}
              </div>
            </div>

            {/* Owner actions — absolute overlay */}
            {isOwner && (
              <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
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
                  {creation.is_visible ? '👁️' : '👁️‍🗨️'}
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
                  ✕
                </button>
              </div>
            )}
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
