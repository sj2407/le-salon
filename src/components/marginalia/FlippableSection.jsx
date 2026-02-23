// 3D flip — both front and back are always rendered; CSS handles the rotation.
// Back face uses inline styles (not section-box class) to avoid sway animations
// overriding the rotateY(180deg) transform.
export const FlippableSection = ({
  children,
  backContent,
  isFlipped,
}) => {
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
        {/* Front face */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          {children}
        </div>
        {/* Back face — inline card styles to avoid .section-box sway animations */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
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
