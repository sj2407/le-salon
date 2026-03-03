import { PortraitModal } from './PortraitModal'
import { EXPERIENCE_CATEGORIES } from './mockData'

/**
 * Experience detail — shows full info for a single experience.
 */
export const ExperienceDetailModal = ({ isOpen, onClose, experience }) => {
  if (!experience) return null

  const category = EXPERIENCE_CATEGORIES.find(c => c.value === experience.category)
  const icon = category?.icon || '✨'
  const categoryLabel = category?.label || experience.category

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title={`${icon} ${experience.name}`} maxWidth="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Category */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '14px',
          background: '#F5F1EB',
          fontSize: '13px',
          color: '#666',
          alignSelf: 'flex-start',
        }}>
          {icon} {categoryLabel}
        </div>

        {/* Date & City */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {experience.date && (
            <div style={{ fontSize: '14px', color: '#2C2C2C' }}>
              {formatDate(experience.date)}
            </div>
          )}
          {experience.city && (
            <div style={{ fontSize: '14px', color: '#666' }}>
              {experience.city}
            </div>
          )}
        </div>

        {/* Note */}
        {experience.note && (
          <div style={{
            marginTop: '8px',
            padding: '14px 16px',
            background: '#F5F1EB',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#2C2C2C',
            lineHeight: 1.6,
            fontFamily: 'Source Serif 4, Georgia, serif',
            whiteSpace: 'pre-wrap',
          }}>
            {experience.note}
          </div>
        )}
      </div>
    </PortraitModal>
  )
}
