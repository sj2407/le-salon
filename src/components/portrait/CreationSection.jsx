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
export const CreationSection = ({ creations, isOwner, onAddCreationText, onAddCreationImage, onViewArchive }) => {
  const safeCreations = creations || []
  const visibleCreations = isOwner ? safeCreations : safeCreations.filter(c => c.is_visible)

  // Most recent visible creation
  const latestCreation = visibleCreations[0] || null

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Creation</h3>
      </div>

      {/* Latest creation */}
          {/* Title */}
          {latestCreation.title && (
            <h3 style={{
              margin: '0 0 10px 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#2C2C2C',
              fontStyle: 'italic',
              paddingRight: 0,
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

          {/* "See all" at bottom */}
          {onViewArchive && visibleCreations.length > 1 && (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={onViewArchive}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#4A7BA7',
                  padding: '4px 2px',
                  fontStyle: 'italic',
                }}
              >
                see all creations
              </button>
            </div>
          )}
    </>
  )
}
