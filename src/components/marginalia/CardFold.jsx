export const CardFold = ({ hasUnread, onClick }) => {
  if (!hasUnread) return null

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '40px',
        height: '40px',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        zIndex: 20
      }}
      title="You have notes from friends"
    >
      {/* Dog-ear fold effect */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, transparent 50%, #E8E0D0 50%)',
          boxShadow: '-2px -2px 3px rgba(0, 0, 0, 0.1)',
          borderBottomRightRadius: '3px'
        }}
      />
    </button>
  )
}
