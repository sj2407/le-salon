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

const CoverPlaceholder = ({ title }) => (
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
      {title}
    </span>
  </div>
)

/**
 * Viewing section — TV shows and movies in the Portrait tab.
 * Mirrors ExperiencesSection (QuillMenu, per-row three-dot menu) and adds a
 * cover thumb to each row. Renders as a full-width card below the 2-col grid.
 */
export const ViewingSection = ({
  viewing,
  isOwner,
  onViewingClick,
  onAddViewing,
  onEditViewing,
  onDeleteViewing,
  onSeeAll,
}) => {
  const safeViewing = viewing || []
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)
  useOutsideClick(menuRef, () => setOpenMenuId(null), openMenuId !== null)

  // Sort: most recently watched first; rows without a date fall back to created_at order
  const sortedAll = [...safeViewing].sort((a, b) => {
    if (a.date_watched && b.date_watched) return new Date(b.date_watched) - new Date(a.date_watched)
    if (a.date_watched) return -1
    if (b.date_watched) return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })
  // Show only the latest 2; "see all" opens the archive
  const sorted = sortedAll.slice(0, 2)
  const hasMore = sortedAll.length > 2

  // Friend view, no rows → hide entirely
  if (sorted.length === 0 && !isOwner) return null

  // Owner empty state — single CTA, no flex-column wrapper
  if (sorted.length === 0 && isOwner) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Watching</h3>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
          Log a TV show or movie that stayed with you.
        </p>
        {onAddViewing && (
          <button
            onClick={onAddViewing}
            style={emptyStateButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE6DA' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F1EB' }}
          >
            Add a TV show or movie
          </button>
        )}
      </>
    )
  }

  const showRowMenu = isOwner && (onEditViewing || onDeleteViewing)

  return (
    <>
      {isOwner && onAddViewing && (
        <QuillMenu items={[
          { label: 'Add a TV show or movie', onClick: onAddViewing },
        ]} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Watching</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sorted.map(row => {
          const menuOpen = openMenuId === row.id
          const typeLabel = row.type === 'tv' ? 'TV' : 'Film'
          return (
            <div
              key={row.id}
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
              {row.cover_url ? (
                <img
                  src={row.cover_url}
                  alt={row.title}
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
                <CoverPlaceholder title={row.title} />
              )}

              <div
                onClick={() => onViewingClick && onViewingClick(row)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  cursor: onViewingClick ? 'pointer' : 'default',
                }}
              >
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.title}
                </div>
                <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>
                  {typeLabel}
                  {row.tmdb_release_year && <> · {row.tmdb_release_year}</>}
                  {row.rating != null && (
                    <span className="handwritten" style={{ color: '#2C2C2C', fontSize: '14px', marginLeft: '8px' }}>
                      {row.rating}/10
                    </span>
                  )}
                </div>
              </div>

              {showRowMenu && (
                <div ref={menuOpen ? menuRef : null} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(menuOpen ? null : row.id)
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
                      {onEditViewing && (
                        <button
                          onClick={() => { onEditViewing(row); setOpenMenuId(null) }}
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
                      {onDeleteViewing && (
                        <button
                          onClick={() => { onDeleteViewing(row); setOpenMenuId(null) }}
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

      {hasMore && onSeeAll && (
        <button
          onClick={onSeeAll}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#4A7BA7',
            fontStyle: 'italic',
            padding: 0,
            marginTop: '12px',
            alignSelf: 'flex-start',
          }}
        >
          see all ({sortedAll.length})
        </button>
      )}
    </>
  )
}
