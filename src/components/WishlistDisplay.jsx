import { useState, useEffect, useRef } from 'react'
import { EmptyStateFantom } from './EmptyStateFantom'
import { typeToMediaType } from '../lib/coverSearchApis'
import { TAG_ICONS } from '../lib/reviewConstants'

const ROTATIONS = [-1.5, 1.2, -0.8, 2, -1.8, 0.5, -1, 1.6, -0.3]

/**
 * Shared wishlist display component — scrapbook card grid
 * Used by both My Corner (Wishlist.jsx) and Friend View (FriendWishlist.jsx)
 *
 * Actions (edit/delete) via onEdit/onDelete show a ... overflow menu.
 * renderItemActions is kept for friend view (claim/unclaim buttons).
 */
export const WishlistDisplay = ({
  items,
  title,
  emptyMessage: _emptyMessage = 'Nothing on the wishlist yet...',
  description,
  onEdit,
  onDelete,
  renderItemActions,
  renderItemStatus,
  renderHeaderActions
}) => {
  const [openMenuId, setOpenMenuId] = useState(null)
  const [failedImages, setFailedImages] = useState(new Set())
  const menuRef = useRef(null)

  // Close menu on click outside or Escape
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

  const hasOverflowMenu = onEdit || onDelete

  return (
    <div style={{ maxWidth: '720px', position: 'relative' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <h1
          className="handwritten"
          style={{ fontSize: '42px', marginBottom: '0', marginTop: '8px', marginLeft: '10px', position: 'relative', zIndex: 1, transform: 'translateY(16px)', cursor: description ? 'help' : 'default' }}
          title={description || undefined}
        >
          {title}
        </h1>
      </div>

      {/* Toolbar: header actions right-aligned */}
      {renderHeaderActions && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px', marginBottom: '16px' }}>
          {renderHeaderActions()}
        </div>
      )}

      {/* Spacer when no toolbar */}
      {!renderHeaderActions && <div style={{ marginTop: '28px' }} />}

      {items.length === 0 ? (
        <EmptyStateFantom />
      ) : (
        <div className="wishlist-grid">
          {items.map((item, index) => {
            const hasImage = item.image_url && !failedImages.has(item.id)
            const mediaType = typeToMediaType(item.type)
            const emoji = TAG_ICONS[mediaType] || null
            const rotation = ROTATIONS[index % ROTATIONS.length]
            const handleCardClick = () => {
              if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer')
            }

            return (
              <div
                key={item.id}
                className="wishlist-card"
                style={{
                  '--rot': `${rotation}deg`,
                  zIndex: openMenuId === item.id ? 15 : 1,
                  cursor: item.link ? 'pointer' : 'default'
                }}
                onClick={item.link ? handleCardClick : undefined}
              >
                {/* Cover image — always square */}
                {hasImage && (
                  <img
                    src={item.image_url}
                    alt=""
                    onError={() => setFailedImages(prev => new Set(prev).add(item.id))}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      objectFit: 'cover',
                      display: 'block',
                      borderRadius: '2px 2px 0 0'
                    }}
                  />
                )}

                {/* Placeholder for items without cover image */}
                {!hasImage && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    aspectRatio: '1',
                    padding: '12px',
                    background: '#F9F5EE'
                  }}>
                    {emoji && (
                      <span style={{
                        fontSize: '38px',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                      }}>
                        {emoji}
                      </span>
                    )}
                  </div>
                )}

                {/* Card info */}
                <div style={{ padding: '8px 10px 10px' }}>
                  <div
                    className="handwritten"
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.name}
                  </div>

                  {/* Status — only rendered when claimed */}
                  {renderItemStatus && renderItemStatus(item)}
                </div>

                {/* Friend view actions (claim/unclaim) */}
                {renderItemActions && (
                  <div
                    style={{
                      padding: '0 11px 10px',
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderItemActions(item)}
                  </div>
                )}

                {/* Overflow menu — top right, revealed on hover */}
                {hasOverflowMenu && (
                  <div
                    ref={openMenuId === item.id ? menuRef : null}
                    className="wishlist-menu-dots"
                    style={openMenuId === item.id ? { opacity: 1 } : undefined}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === item.id ? null : item.id)
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'radial-gradient(circle at 35% 30%, #fff, #f5f1eb 60%, #e8e2d8)',
                        color: '#888',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 6px rgba(0,0,0,0.25), 0 6px 14px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.6)',
                        padding: 0
                      }}
                      aria-label="Actions"
                    >
                      ⋯
                    </button>
                    {openMenuId === item.id && (
                      <div onClick={(e) => e.stopPropagation()} style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        background: '#FFFEFA',
                        borderRadius: '4px',
                        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.12)',
                        padding: '4px 0',
                        minWidth: '100px',
                        zIndex: 10
                      }}>
                        {onEdit && (
                          <button
                            onClick={() => { onEdit(item); setOpenMenuId(null) }}
                            style={{
                              display: 'block',
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: '8px 16px',
                              fontSize: '14px',
                              color: '#2C2C2C',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => { onDelete(item.id); setOpenMenuId(null) }}
                            style={{
                              display: 'block',
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: '8px 16px',
                              fontSize: '14px',
                              color: '#C75D5D',
                              cursor: 'pointer',
                              textAlign: 'left'
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
      )}
    </div>
  )
}
