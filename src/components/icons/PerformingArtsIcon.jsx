export const PerformingArtsIcon = ({ className = "section-icon" }) => {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        animation: 'bookFloat 4.5s ease-in-out infinite'
      }}
    >
      <img
        src="/images/masks-ready.png"
        alt="Theatre Masks"
        style={{
          width: '65px',
          height: '65px',
          objectFit: 'contain'
        }}
      />
    </div>
  )
}
