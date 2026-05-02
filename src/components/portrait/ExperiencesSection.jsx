import { useState, useRef } from 'react'
import { QuillMenu } from './QuillMenu'
import { useOutsideClick } from '../../hooks/useOutsideClick'

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
 * Experiences section — bulleted list of cultural experiences.
 * Section quill menu (owner) for scan/add. Per-row three-dot menu (owner) for edit/delete.
 */
export const ExperiencesSection = ({
  experiences,
  isOwner,
  onExperienceClick,
  onAddExperience,
  onScanPlaybill,
  onEditExperience,
  onDeleteExperience,
}) => {
  const safeExperiences = experiences || []
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)
  useOutsideClick(menuRef, () => setOpenMenuId(null), openMenuId !== null)

  // Sort reverse chronological
  const sorted = [...safeExperiences].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date) - new Date(a.date)
  })

  // Empty state — only the add cell for owner, nothing for friend
  if (sorted.length === 0 && !isOwner) return null

  // Empty state for owner — card with prompt buttons
  if (sorted.length === 0 && isOwner) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Experiences</h3>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
          Log a concert, exhibition, or trip that shaped you.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {onScanPlaybill && (
            <button
              onClick={onScanPlaybill}
              style={emptyStateButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE6DA' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F1EB' }}
            >
              Scan a playbill
            </button>
          )}
          {onAddExperience && (
            <button
              onClick={onAddExperience}
              style={emptyStateButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE6DA' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F1EB' }}
            >
              Add an experience
            </button>
          )}
        </div>
      </>
    )
  }

  const showRowMenu = isOwner && (onEditExperience || onDeleteExperience)

  return (
    <>
      {/* Section quill — owner only */}
      {isOwner && (onScanPlaybill || onAddExperience) && (
        <QuillMenu items={[
          onScanPlaybill && { label: 'Scan a playbill', onClick: onScanPlaybill },
          onAddExperience && { label: 'Add an experience', onClick: onAddExperience },
        ].filter(Boolean)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Experiences</h3>
      </div>

      {/* Bullet list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sorted.map(exp => {
          const menuOpen = openMenuId === exp.id
          return (
            <div
              key={exp.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: '#2C2C2C',
                lineHeight: 1.5,
              }}
            >
              <div
                onClick={() => onExperienceClick && onExperienceClick(exp)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  cursor: onExperienceClick ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontWeight: 500 }}>{exp.name}</span>
                {exp.rating != null && (
                  <span className="handwritten" style={{ color: '#2C2C2C', fontSize: '14px', marginLeft: '6px' }}>
                    {exp.rating}/10
                  </span>
                )}
              </div>

              {showRowMenu && (
                <div ref={menuOpen ? menuRef : null} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(menuOpen ? null : exp.id)
                    }}
                    aria-label="Actions"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      fontSize: '16px',
                      color: '#999',
                      lineHeight: 1,
                      letterSpacing: '1px',
                    }}
                  >
                    &middot;&middot;&middot;
                  </button>
                  {menuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '2px',
                        background: '#FFFEFA',
                        borderRadius: '4px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                        padding: '4px 0',
                        minWidth: '110px',
                        zIndex: 10,
                      }}
                    >
                      {onEditExperience && (
                        <button
                          onClick={() => { onEditExperience(exp); setOpenMenuId(null) }}
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
                      {onDeleteExperience && (
                        <button
                          onClick={() => { onDeleteExperience(exp); setOpenMenuId(null) }}
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
            </div>
          )
        })}
      </div>
    </>
  )
}
