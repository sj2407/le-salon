import { useState } from 'react'
import { QuillMenu } from './QuillMenu'

const emptyStateButtonStyle = {
  padding: '10px 14px',
  background: '#F5F1EB',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '13px',
  color: '#2C2C2C',
  textAlign: 'left',
  transition: 'background 0.15s',
}

/**
 * Creation section — shows the most recent visible creation.
 * Owner can toggle visibility (eye icon), add new creations, view archive.
 * Quill menu for owners with write/upload options.
 * Friend view: only visible creations; hidden entirely if none.
 */
export const CreationSection = ({ creations, isOwner, onToggleVisibility, onAddCreationText, onAddCreationImage, onViewArchive, onDelete }) => {
  const [openMenuId, setOpenMenuId] = useState(null)

  const safeCreations = creations || []
  const visibleCreations = isOwner ? safeCreations : safeCreations.filter(c => c.is_visible)

  // Most recent visible creation
  const latestCreation = visibleCreations[0] || null

  // Count of archived visible creations (beyond the first)
  const archivedVisibleCount = visibleCreations.length > 1 ? visibleCreations.length - 1 : 0

  // Completely empty — friend view: hide entirely
  if (!isOwner && visibleCreations.length === 0) return null

  // Empty state for owner — card with prompt buttons
  if (!latestCreation && isOwner && (onAddCreationText || onAddCreationImage)) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '18px' }}>{'\u270d\ufe0f'}</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2C' }}>Creation</h3>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
          Share a poem, a note, a screenshot — something you made.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {onAddCreationText && (
            <button
              onClick={onAddCreationText}
              style={emptyStateButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE6DA' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F1EB' }}
            >
              Write something
            </button>
          )}
          {onAddCreationImage && (
            <button
              onClick={onAddCreationImage}
              style={emptyStateButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE6DA' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F1EB' }}
            >
              Upload an image
            </button>
          )}
        </div>
      </>
    )
  }

  // Nothing to show
  if (!latestCreation) return null

  return (
    <>
      {/* Quill menu — owner only */}
      {isOwner && (onAddCreationText || onAddCreationImage) && (
        <QuillMenu items={[
          onAddCreationText && { label: 'Write something', onClick: onAddCreationText },
          onAddCreationImage && { label: 'Upload an image', onClick: onAddCreationImage },
        ].filter(Boolean)} />
      )}

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{'\u270d\ufe0f'}</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2C' }}>Creation</h3>
        </div>
        {onViewArchive && (
          <button
            onClick={onViewArchive}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#4A7BA7',
              padding: 0,
            }}
          >
            See all
          </button>
        )}
      </div>

      {/* Latest creation */}
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

          {/* Content — text */}
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

          {/* Content — image (capped preview, click to see all) */}
          {latestCreation.type === 'image' && latestCreation.image_url && (
            <div
              onClick={() => onViewArchive && onViewArchive()}
              style={{
                maxHeight: '160px',
                overflow: 'hidden',
                borderRadius: '8px',
                cursor: onViewArchive ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              <img
                src={latestCreation.image_url}
                alt={latestCreation.title || 'Creation'}
                style={{
                  width: '100%',
                  display: 'block',
                  objectFit: 'cover',
                  objectPosition: 'top',
                }}
              />
              {/* Fade-out overlay at bottom */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40px',
                background: 'linear-gradient(transparent, rgba(255,254,250,0.9))',
                pointerEvents: 'none',
              }} />
            </div>
          )}
    </>
  )
}
