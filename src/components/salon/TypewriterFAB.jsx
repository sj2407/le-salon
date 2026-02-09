/**
 * Floating typewriter icon that opens the Commonplace Book.
 * Fixed position bottom-right. Shows a badge dot for new entries.
 */
export const TypewriterFAB = ({ hasNewEntries, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        cursor: 'pointer',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      aria-label="Open Commonplace Book"
    >
      <img
        src="/images/typewriter-ready.png"
        alt="Commonplace Book"
        style={{
          width: '84px',
          height: '84px',
          objectFit: 'contain',
          pointerEvents: 'none'
        }}
      />

      {/* New entries badge */}
      {hasNewEntries && (
        <span
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#E8534F',
            border: '2px solid transparent'
          }}
        />
      )}
    </button>
  )
}
