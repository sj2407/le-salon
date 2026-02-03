import { useRef } from 'react'

export const LookingForwardIcon = ({ className = "section-icon" }) => {
  const audioRef = useRef(null)

  const handleMouseEnter = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
    }
  }

  const handleMouseLeave = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        animation: 'calendarFloat 4.2s ease-in-out infinite'
      }}
    >
      {/* Calendar page flip sound - plays on hover */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
      >
        <source src="/sounds/calendar-flip.wav" type="audio/wav" />
      </audio>

      <img
        src="/images/calendar-ready.png"
        alt="Calendar"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: 'pointer',
          width: '70px',
          height: '70px',
          objectFit: 'contain'
        }}
      />
    </div>
  )
}
