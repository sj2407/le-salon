import { useState, useEffect, useRef } from 'react'
import { PortraitModal } from './PortraitModal'
import { ConfirmModal } from '../ConfirmModal'

/**
 * Viewing Archive — all watched TV/movies, reverse chronological.
 * Owner: ⋯ overflow menu (Edit, Delete) on each row. Friend view: read-only.
 */
const formatWatched = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const ViewingArchiveModal = ({
  isOpen,
  onClose,
  viewing,
  isOwner,
  onEditViewing,
  onDeleteViewing,
}) => {
  const [openMenuId, setOpenMenuId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (openMenuId === null) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openMenuId])

  useEffect(() => {
    if (!isOpen) setOpenMenuId(null)
  }, [isOpen])

  const sorted = [...(viewing || [])].sort((a, b) => {
    if (a.date_watched && b.date_watched) return new Date(b.date_watched) - new Date(a.date_watched)
    if (a.date_watched) return -1
    if (b.date_watched) return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title="All Watching" maxWidth="480px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sorted.map(row => {
          const typeLabel = row.type === 'tv' ? 'TV' : 'Film'
          return (
            <div
              key={row.id}
              style={{
                padding: '12px',
                paddingRight: isOwner ? '44px' : '12px',
                borderRadius: '10px',
                background: '#F5F1EB',
                position: 'relative',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              {/* Cover */}
              {row.cover_url ? (
                <img
                  src={row.cover_url}
                  alt={row.title}
                  style={{
                    width: '50px',
                    height: '75px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  }}
                />
              ) : (
                <div style={{
                  width: '50px',
                  height: '75px',
                  background: '#E8DCC8',
                  borderRadius: '4px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  boxSizing: 'border-box',
                }}>
                  <span style={{
                    fontSize: '9px',
                    color: '#2C2C2C',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    fontStyle: 'italic',
                  }}>
                    {row.title}
                  </span>
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#2C2C2C' }}>
                  {row.title}
                </div>
                <div style={{ fontSize: '12px', color: '#777', marginTop: '4px', lineHeight: 1.5 }}>
                  {typeLabel}
                  {row.tmdb_release_year && <> · {row.tmdb_release_year}</>}
                  {row.rating != null && (
                    <span className="handwritten" style={{ color: '#2C2C2C', fontSize: '14px', margin: '0 8px' }}>
                      {row.rating}/10
                    </span>
                  )}
                  {row.date_watched && (
                    <span style={{ fontStyle: 'italic', color: '#999' }}>
                      · Watched {formatWatched(row.date_watched)}
                    </span>
                  )}
                </div>
                {row.tmdb_overview && (
                  <div
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    style={{
                      marginTop: '8px',
                      padding: '8px 10px',
                      background: '#FFFEFA',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#2C2C2C',
                      lineHeight: 1.5,
                      fontFamily: 'Source Serif 4, Georgia, serif',
                      cursor: 'pointer',
                      ...(expandedId === row.id
                        ? {}
                        : {
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }
                      ),
                    }}
                    title={expandedId === row.id ? 'Tap to collapse' : 'Tap to read more'}
                  >
                    {row.tmdb_overview}
                  </div>
                )}
              </div>

              {/* Overflow menu */}
              {isOwner && (onEditViewing || onDeleteViewing) && (
                <div
                  ref={openMenuId === row.id ? menuRef : null}
                  style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
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
                  {openMenuId === row.id && (
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
                          onClick={() => { onEditViewing(row); setOpenMenuId(null); onClose() }}
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
                          onClick={() => {
                            setOpenMenuId(null)
                            setConfirmState({
                              message: `Delete "${row.title}" from your watching list?`,
                              onConfirm: async () => { onDeleteViewing(row) },
                            })
                          }}
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

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontSize: '14px' }}>
            Nothing watched yet
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => { await confirmState?.onConfirm(); setConfirmState(null) }}
        title="Confirm"
        message={confirmState?.message || ''}
        confirmText="Delete"
        destructive
      />
    </PortraitModal>
  )
}
