import { useState } from 'react'

/**
 * Creation section — shows the most recent visible creation.
 * Owner can toggle visibility (eye icon), add new creations, view archive.
 * Friend view: only visible creations; hidden entirely if none.
 */
export const CreationSection = ({ creations, isOwner, onToggleVisibility, onAddCreation, onViewArchive, onDelete }) => {
  const [openMenuId, setOpenMenuId] = useState(null)

  const safeCreations = creations || []
  const visibleCreations = isOwner ? safeCreations : safeCreations.filter(c => c.is_visible)

  // Most recent visible creation
  const latestCreation = visibleCreations[0] || null

  // Count of archived visible creations (beyond the first)
  const archivedVisibleCount = visibleCreations.length > 1 ? visibleCreations.length - 1 : 0

  // Completely empty — friend view: hide entirely
  if (!isOwner && visibleCreations.length === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      {/* Latest creation */}
      {latestCreation && (
        <div style={{
          background: '#FFFEFA',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '2px 3px 8px rgba(0,0,0,0.1)',
          position: 'relative',
        }}>
          {/* Owner actions — absolute overlay */}
          {isOwner && (
            <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 2 }}>
              {/* Eye toggle */}
              <button
                onClick={() => onToggleVisibility && onToggleVisibility(latestCreation.id, !latestCreation.is_visible)}
                title={latestCreation.is_visible ? 'Visible to friends' : 'Hidden from friends'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  fontSize: '16px',
                  opacity: latestCreation.is_visible ? 1 : 0.4,
                  transition: 'opacity 0.15s',
                }}
              >
                {'\ud83d\udc41\ufe0f'}
              </button>

              {/* Overflow menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setOpenMenuId(openMenuId === latestCreation.id ? null : latestCreation.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontSize: '16px',
                    color: '#A89F91',
                    lineHeight: 1,
                    letterSpacing: '1px',
                  }}
                  aria-label="Actions"
                >
                  &middot;&middot;&middot;
                </button>
                {openMenuId === latestCreation.id && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    background: '#FFFEFA',
                    borderRadius: '4px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                    padding: '4px 0',
                    minWidth: '100px',
                    zIndex: 10,
                  }}>
                    {onDelete && (
                      <button
                        onClick={() => { onDelete(latestCreation.id); setOpenMenuId(null) }}
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
            </div>
          )}

          {/* Title */}
          {latestCreation.title && (
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#2C2C2C',
              fontStyle: 'italic',
              paddingRight: isOwner ? '60px' : 0,
            }}>
              {latestCreation.title}
            </h3>
          )}

          {/* Content */}
          {latestCreation.type === 'text' && latestCreation.text_content && (
            <p style={{
              margin: 0,
              fontSize: '15px',
              lineHeight: 1.7,
              color: '#2C2C2C',
              whiteSpace: 'pre-wrap',
              fontFamily: 'Source Serif 4, Georgia, serif',
              paddingRight: isOwner && !latestCreation.title ? '60px' : 0,
            }}>
              {latestCreation.text_content}
            </p>
          )}

          {/* View archive link */}
          {(archivedVisibleCount > 0 || (isOwner && safeCreations.length > 1)) && onViewArchive && (
            <button
              onClick={onViewArchive}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#4A7BA7',
                padding: 0,
                marginTop: '14px',
                display: 'block',
              }}
            >
              {isOwner
                ? 'View archive'
                : `View ${archivedVisibleCount} more`
              }
            </button>
          )}
        </div>
      )}

      {/* Empty state (owner only — no creations at all) */}
      {!latestCreation && isOwner && (
        <div style={{
          background: '#FFFEFA',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '2px 3px 8px rgba(0,0,0,0.1)',
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
            No creations yet.
          </p>
        </div>
      )}

      {/* Add creation prompt — always present for owner */}
      {isOwner && onAddCreation && (
        <button
          onClick={onAddCreation}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#999',
            fontStyle: 'italic',
            padding: '10px 0 0 0',
            display: 'block',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#666' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#999' }}
        >
          + Add a creation — poem, note, screenshot...
        </button>
      )}
    </div>
  )
}
