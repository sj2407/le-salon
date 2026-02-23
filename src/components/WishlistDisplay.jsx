import { useState, useEffect, useRef } from 'react'
import { EmptyStateFantom } from './EmptyStateFantom'
import { CoverThumbnail } from './cover-search/CoverThumbnail'
import { typeToMediaType } from '../lib/coverSearchApis'

/**
 * Shared wishlist display component
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item, index) => (
            <div
              key={item.id}
              style={{
                background: '#FFFEFA',
                border: 'none',
                borderRadius: '2px',
                padding: '16px',
                boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                transform: `rotate(${index % 2 === 0 ? '-0.3' : '0.3'}deg)`,
                animation: `reviewSway${(index % 3) + 1} ${5 + index % 2}s ease-in-out infinite`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: openMenuId === item.id ? 5 : 1
              }}
            >
              {item.image_url && typeToMediaType(item.type) && (
                <div style={{ marginRight: '12px', flexShrink: 0 }}>
                  <CoverThumbnail imageUrl={item.image_url} tag={typeToMediaType(item.type)} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {item.type && (
                    <span style={{
                      fontSize: '12px',
                      color: '#666',
                      background: '#F5F1EB',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 500
                    }}>
                      {item.type}
                    </span>
                  )}
                  {renderItemStatus && renderItemStatus(item)}
                </div>
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '14px',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      color: '#4A7BA7',
                      textDecoration: 'underline'
                    }}
                  >
                    {item.name}
                  </a>
                ) : (
                  <div style={{ fontSize: '14px', fontStyle: 'italic', fontWeight: 400 }}>{item.name}</div>
                )}
              </div>

              {/* Overflow menu for edit/delete */}
              {hasOverflowMenu && (
                <div ref={openMenuId === item.id ? menuRef : null} style={{ marginLeft: '16px', position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      fontSize: '16px',
                      color: '#A89F91',
                      lineHeight: 1,
                      letterSpacing: '1px'
                    }}
                    aria-label="Actions"
                  >
                    &middot;&middot;&middot;
                  </button>
                  {openMenuId === item.id && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
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

              {/* Friend view actions (claim/unclaim) */}
              {renderItemActions && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '16px' }}>
                  {renderItemActions(item)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
