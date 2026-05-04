import { PortraitModal } from './PortraitModal'
import { ExperienceGraph2D } from './ExperienceGraph2D'

/**
 * Experience Themes "See all" modal — full 2D bipartite graph (themes ↔ experiences)
 * when graph data exists, flat theme list as fallback. Mirrors ReadingDetailModal.
 */
export const ExperienceThemesModal = ({ isOpen, onClose, experiences, experienceThemes, experienceGraph }) => {
  const hasGraph = experienceGraph && experienceGraph.themes?.length > 0 && experienceGraph.edges?.length > 0

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title="Experience themes" maxWidth="520px">
      {hasGraph ? (
        <ExperienceGraph2D experiences={experiences} experienceGraph={experienceGraph} />
      ) : (
        <>
          {/* Theme tags fallback */}
          {experienceThemes && experienceThemes.length > 0 ? (
            <div>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '11px',
                color: '#999',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
              }}>
                Recurring themes
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {experienceThemes.map((theme, i) => (
                  <span key={i} style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '14px',
                    background: '#E8DCC8',
                    fontSize: '13px',
                    color: '#2C2C2C',
                    fontStyle: 'italic',
                  }}>
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontSize: '14px' }}>
              Add a few more enriched experiences to see themes emerge.
            </div>
          )}
        </>
      )}
    </PortraitModal>
  )
}
