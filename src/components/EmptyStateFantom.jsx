/**
 * Animated ghost lady placeholder for empty pages.
 * Shows a floating fantom image that sways in a clockwise circle.
 * Used by: ReviewsDisplay, WishlistDisplay, LaListe, ToDo
 */
export const EmptyStateFantom = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px 40px'
  }}>
    <img
      src="/images/fantom.png"
      alt=""
      style={{
        width: '288px',
        height: 'auto',
        opacity: 0.55,
        pointerEvents: 'none',
        animation: 'fantomOrbit 6s ease-in-out infinite',
        filter: 'contrast(1.35)'
      }}
    />
  </div>
)
