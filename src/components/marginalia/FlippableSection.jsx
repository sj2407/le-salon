// Crossfade between front and back faces.
// Front fades out while back fades in over 400ms.
export const FlippableSection = ({
  children,
  backContent,
  isFlipped,
}) => {
  return (
    <div style={{ position: 'relative' }}>
      {/* Front face — always in flow, determines container height */}
      <div style={{
        opacity: isFlipped ? 0 : 1,
        transition: 'opacity 400ms ease-in-out',
        pointerEvents: isFlipped ? 'none' : 'auto',
      }}>
        {children}
      </div>
      {/* Back face — absolute, matches front face size */}
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
        }}
      >
        {backContent}
      </div>
    </div>
  )
}
