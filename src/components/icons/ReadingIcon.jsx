import { useRef } from 'react'

export const ReadingIcon = ({ className = "section-icon" }) => {
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
        animation: 'bookFloat 4.5s ease-in-out infinite'
      }}
    >
      {/* Page turn sound - plays on hover */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
      >
        <source src="/sounds/page-turn.wav" type="audio/wav" />
      </audio>

      <img
        src="/images/book-ready.png"
        alt="Book"
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
