import { useState, useEffect, useRef } from 'react'
import { PortraitModal } from './PortraitModal'
import { ConfirmModal } from '../ConfirmModal'
import { EXPERIENCE_CATEGORIES } from './mockData'

/**
 * Experience Archive — all past experiences in reverse chronological order.
 * Owner: ⋯ overflow menu (Edit, Delete) on each row.
 * Friend view: read-only.
 */
export const ExperienceArchiveModal = ({
  isOpen,
  onClose,
  experiences,
  isOwner,
  onEditExperience,
  onDeleteExperience,
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

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const sorted = [...(experiences || [])].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date) - new Date(a.date)
  })

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title="All Experiences" maxWidth="480px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sorted.map(exp => {
          const cat = EXPERIENCE_CATEGORIES.find(c => c.value === exp.category)
          const icon = cat?.icon || '✨'
          const meta = [exp.city, formatDate(exp.date)].filter(Boolean).join(' · ')
          return (
            <div
              key={exp.id}
              style={{
                padding: '12px',
                paddingRight: isOwner ? '44px' : '12px',
                borderRadius: '10px',
                background: '#F5F1EB',
                position: 'relative',
              }}
            >
              {/* ··· overflow menu */}
              {isOwner && (onEditExperience || onDeleteExperience) && (
                <div
                  ref={openMenuId === exp.id ? menuRef : null}
                  style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setOpenMenuId(openMenuId === exp.id ? null : exp.id)}
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
                  {openMenuId === exp.id && (
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
                          onClick={() => {
                            setOpenMenuId(null)
                            setConfirmState({
                              message: `Delete "${exp.name}" from your experiences?`,
                              onConfirm: async () => { onDeleteExperience(exp) },
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

              {/* Title row: icon · name · subcategory tag · rating */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#2C2C2C' }}>
                  {exp.name}
                </span>
                {exp.subcategory && (
                  <span style={{
                    display: 'inline-block',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    background: '#E8DCC8',
                    fontSize: '11px',
                    color: '#666',
                  }}>
                    {exp.subcategory}
                  </span>
                )}
                {exp.rating != null && (
                  <span className="handwritten" style={{ fontSize: '15px', color: '#2C2C2C' }}>
                    {exp.rating}/10
                  </span>
                )}
              </div>

              {/* Meta: city · date · artist (when concert) */}
              {(meta || exp.artist_name) && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  {[meta, exp.artist_name].filter(Boolean).join(' · ')}
                </div>
              )}

              {/* Wikipedia description — tap to expand/collapse */}
              {exp.wikipedia_description && (
                <div style={{ marginTop: '8px' }}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedId(expandedId === exp.id ? null : exp.id)
                    }}
                    title={expandedId === exp.id ? 'Tap to collapse' : 'Tap to read more'}
                    style={{
                      padding: '10px 12px',
                      background: '#FFFEFA',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#2C2C2C',
                      lineHeight: 1.5,
                      fontFamily: 'Source Serif 4, Georgia, serif',
                      cursor: 'pointer',
                      ...(expandedId === exp.id
                        ? {}
                        : {
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }
                      ),
                    }}
                  >
                    {exp.wikipedia_description}
                  </div>
                  {exp.wikipedia_url && (
                    <div style={{ marginTop: '4px', fontSize: '12px' }}>
                      <a
                        href={exp.wikipedia_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: '#4A7BA7', textDecoration: 'underline' }}
                      >
                        Read on Wikipedia →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              {exp.note && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px 12px',
                  background: '#FFFEFA',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#2C2C2C',
                  lineHeight: 1.5,
                  fontFamily: 'Source Serif 4, Georgia, serif',
                  whiteSpace: 'pre-wrap',
                }}>
                  {exp.note}
                </div>
              )}
            </div>
          )
        })}

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontSize: '14px' }}>
            No experiences yet
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
