// Crossfade — back face fades in as an overlay on top of the front.
// Only one wrapper div so section-box stays close to the grid for CSS selectors.
export const FlippableSection = ({
  children,
  backContent,
  isFlipped,
}) => {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <div
        style={{
          opacity: isFlipped ? 1 : 0,
          transition: 'opacity 400ms ease-in-out',
          pointerEvents: isFlipped ? 'auto' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'auto',
          boxSizing: 'border-box',
          borderRadius: '2px',
          padding: '14px',
          background: '#FFFEFA',
          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 5,
        }}
      >
        {backContent}
      </div>
    </div>
  )
}
