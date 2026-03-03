import { EXPERIENCE_CATEGORIES } from './mockData'

/**
 * Get the emoji icon for an experience category.
 */
const getCategoryIcon = (category) => {
  const found = EXPERIENCE_CATEGORIES.find(c => c.value === category)
  return found ? found.icon : '\u2728'
}

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

/**
 * Experiences section — 3-column grid of cultural experiences.
 * Final cell is an "add experience" prompt for owners.
 */
export const ExperiencesSection = ({ experiences, isOwner, onExperienceClick, onAddExperience }) => {
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '18px' }}>{'\ud83c\udfad'}</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2C' }}>Experiences</h3>
      </div>

      {/* 3-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
      }}>
        {sorted.map(exp => (
          <div
            key={exp.id}
            onClick={() => onExperienceClick && onExperienceClick(exp)}
            style={{
              background: '#FFFEFA',
              borderRadius: '10px',
              padding: '14px 12px',
              boxShadow: '2px 3px 8px rgba(0,0,0,0.1)',
              cursor: onExperienceClick ? 'pointer' : 'default',
              transition: 'transform 0.15s, box-shadow 0.15s',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '2px 4px 12px rgba(0,0,0,0.14)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '2px 3px 8px rgba(0,0,0,0.1)'
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>
              {getCategoryIcon(exp.category)}
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#2C2C2C',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {exp.name}
            </span>
            <span style={{ fontSize: '11px', color: '#999' }}>
              {[exp.city, formatShortDate(exp.date)].filter(Boolean).join(' \u00b7 ')}
            </span>
          </div>
        ))}

        {/* Add experience cell — owner only */}
        {isOwner && onAddExperience && (
          <div
            onClick={onAddExperience}
            style={{
              background: 'transparent',
              borderRadius: '10px',
              padding: '14px 12px',
              cursor: 'pointer',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              animation: 'portraitPulse 3s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: '22px', color: '#999', lineHeight: 1 }}>+</span>
            <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic', textAlign: 'center' }}>
              Add an experience
            </span>
          </div>
        )}
      </div>

      {/* Pulse animation keyframes — injected inline */}
      <style>{`
        @keyframes portraitPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0s !important; }
        }
        @media (max-width: 500px) {
          /* Stack to 2 columns on narrow screens */
          .portrait-experiences-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  )
}
