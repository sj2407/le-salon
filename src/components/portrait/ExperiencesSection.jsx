import { useState, useRef } from 'react'
import { QuillMenu } from './QuillMenu'
import { ExperienceGraphCompact } from './ExperienceGraphCompact'
import { useOutsideClick } from '../../hooks/useOutsideClick'

const CATEGORY_LABELS = {
  concert: 'Concert',
  exhibition: 'Exhibition',
  restaurant: 'Restaurant',
  cinema: 'Cinema',
  theatre: 'Theatre',
  other: 'Other',
}

// Inline tag shown next to the experience name. Subcategory wins (more specific);
// otherwise falls back to the category label so every row carries a tag.
function rowTag(exp) {
  if (exp.subcategory) return exp.subcategory
  return CATEGORY_LABELS[exp.category] || null
}

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

const CoverPlaceholder = ({ name }) => (
  <div style={{
    width: '40px',
    height: '60px',
    background: '#E8DCC8',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    boxSizing: 'border-box',
    flexShrink: 0,
  }}>
    <span style={{
      fontSize: '8px',
      color: '#2C2C2C',
      textAlign: 'center',
      lineHeight: 1.2,
      fontStyle: 'italic',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
    }}>
      {name}
    </span>
  </div>
)

/**
 * Experiences section — bulleted list of cultural experiences.
 * Section quill menu (owner) for scan/add. Per-row three-dot menu (owner) for edit/delete.
 */
export const ExperiencesSection = ({
  experiences,
  experienceThemes,
  experienceGraph,
  isOwner,
  onExperienceClick,
  onAddExperience,
  onScanPlaybill,
  onEditExperience,
  onDeleteExperience,
  onSeeAll,
  onSeeAllThemes,
}) => {
  const safeExperiences = experiences || []
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)
  useOutsideClick(menuRef, () => setOpenMenuId(null), openMenuId !== null)

  // Sort reverse chronological — full sorted list used for the themes graph;
  // the inline list shows only the 3 most recent.
  const sortedAll = [...safeExperiences].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date) - new Date(a.date)
  })
  const sorted = sortedAll.slice(0, 3)

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

      {/* Row list — cover thumb + name + tag/rating, mirroring Viewing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sorted.map(exp => {
          const menuOpen = openMenuId === exp.id
          return (
            <div
              key={exp.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '14px',
                color: '#2C2C2C',
                lineHeight: 1.4,
              }}
            >
              {exp.image_url ? (
                <img
                  src={exp.image_url}
                  alt={exp.name}
                  style={{
                    width: '40px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '3px',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  }}
                />
              ) : (
                <CoverPlaceholder name={exp.name} />
              )}

              <div
                onClick={() => onExperienceClick && onExperienceClick(exp)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  cursor: onExperienceClick ? 'pointer' : 'default',
                }}
              >
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exp.name}
                </div>
                <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>
                  {rowTag(exp)}
                  {exp.rating != null && (
                    <span className="handwritten" style={{ color: '#2C2C2C', fontSize: '14px', marginLeft: '8px' }}>
                      {exp.rating}/10
                    </span>
                  )}
                </div>
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

      {/* Themes — top 3 inline, click → opens full themes modal */}
      {experienceGraph && experienceGraph.themes?.length > 0 && experienceGraph.edges?.length > 0 && (
        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px' }}>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '11px',
            color: '#999',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 600,
          }}>
            Recurring themes
          </p>
          <ExperienceGraphCompact
            experiences={sortedAll}
            experienceGraph={experienceGraph}
            onClick={onSeeAllThemes}
          />
        </div>
      )}

      {/* Footer: see all themes (left) + see all experiences (right) on the same line */}
      {(onSeeAll || onSeeAllThemes) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
        }}>
          {onSeeAllThemes && experienceGraph?.edges?.length > 0 ? (
            <button
              type="button"
              onClick={onSeeAllThemes}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#4A7BA7',
                fontStyle: 'italic',
                padding: 0,
              }}
            >
              see all themes
            </button>
          ) : <span />}
          {onSeeAll && (
            <button
              type="button"
              onClick={onSeeAll}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#4A7BA7',
                fontStyle: 'italic',
                padding: 0,
              }}
            >
              see all
            </button>
          )}
        </div>
      )}
    </>
  )
}
