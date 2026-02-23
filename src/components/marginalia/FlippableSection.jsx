// 3D flip — both front and back are always rendered; CSS handles the rotation.
// The visible face is in normal flow (determines container height).
// The hidden face is absolute-positioned so it doesn't affect sizing.
export const FlippableSection = ({
  children,
  backContent,
  isFlipped,
}) => {
  const hiddenFaceStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
  }

  return (
    <div style={{ perspective: '1200px' }}>
      <div
        style={{
          transition: 'transform 600ms ease-in-out',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
        }}
      >
        {/* Front face — in flow when visible, absolute when flipped away */}
        <div style={{
          backfaceVisibility: 'hidden',
          ...(isFlipped ? hiddenFaceStyles : {}),
        }}>
          {children}
        </div>
        {/* Back face — in flow when flipped, absolute when hidden */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            ...(!isFlipped ? { ...hiddenFaceStyles, height: '100%' } : {}),
            overflow: 'auto',
            boxSizing: 'border-box',
            borderRadius: '2px',
            padding: '24px',
            background: '#FFFEFA',
            boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {backContent}
        </div>
      </div>
    </div>
  )
}
