/**
 * Shared wishlist display component
 * Used by both My Corner (Wishlist.jsx) and Friend View (FriendWishlist.jsx)
 *
 * @param {Array} items - Array of wishlist item objects
 * @param {string} title - Display title (e.g., "My Wishlist" or "Sarah's Wishlist")
 * @param {string} emptyMessage - Message when no items exist
 * @param {string} description - Optional description text below title
 * @param {function} renderItemActions - Function to render action buttons per item (edit/delete or claim)
 * @param {function} renderItemStatus - Function to render status badge per item
 * @param {function} renderHeaderActions - Optional function to render "+" button
 */
export const WishlistDisplay = ({
  items,
  title,
  emptyMessage = 'Nothing on the wishlist yet...',
  description,
  renderItemActions,
  renderItemStatus,
  renderHeaderActions
}) => {
  return (
    <div style={{ maxWidth: '720px', position: 'relative' }}>
      {/* Gift box collage */}
      <img
        src="/images/gift-ready.png"
        alt=""
        style={{
          position: 'absolute',
          top: '8px',
          right: '15%',
          width: '80px',
          height: 'auto',
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'bookFloat 4.5s ease-in-out infinite',
          filter: 'contrast(1.3) brightness(1.1)'
        }}
      />

      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '24px', marginTop: '8px', marginLeft: '10px', position: 'relative', zIndex: 1, transform: 'translateY(16px)' }}>
        {title}
      </h1>

      {renderHeaderActions && renderHeaderActions()}

      {description && (
        <p style={{ fontSize: '15px', color: '#666', fontStyle: 'italic', marginBottom: '24px', textAlign: 'center' }}>
          {description}
        </p>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          {emptyMessage}
        </div>
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
                alignItems: 'center'
              }}
            >
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
