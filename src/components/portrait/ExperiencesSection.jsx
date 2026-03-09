import { QuillMenu } from './QuillMenu'

/**
 * Format a date string to a short readable format (e.g., "Jan 15").
 */
const formatShortDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
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

/**
 * Experiences section — 3-column grid of cultural experiences.
 * Quill menu for owners with scan/add options.
 */
export const ExperiencesSection = ({ experiences, isOwner, onExperienceClick, onAddExperience, onScanPlaybill }) => {
  const safeExperiences = experiences || []

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

  return (
    <>
      {/* Quill menu — owner only */}
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
          const detail = [exp.city, formatShortDate(exp.date)].filter(Boolean).join(' \u00b7 ')
          return (
            <div
              key={exp.id}
              onClick={() => onExperienceClick && onExperienceClick(exp)}
              style={{
                fontSize: '14px',
                color: '#2C2C2C',
                lineHeight: 1.5,
                cursor: onExperienceClick ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontWeight: 500 }}>{exp.name}</span>
              {detail && (
                <span style={{ color: '#999', fontSize: '12px', marginLeft: '6px' }}>
                  {detail}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
