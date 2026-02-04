import { useRef } from 'react'

export const WatchingIcon = ({ className = "section-icon" }) => {
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
        animation: 'tvFloat 3.8s ease-in-out infinite'
      }}
    >
      {/* Film reel sound - plays on hover */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
      >
        <source src="/sounds/film-reel.wav" type="audio/wav" />
      </audio>

      <img
        src="/images/tv-ready.png"
        alt="TV"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: 'pointer',
          width: '91px',
          height: '91px',
          objectFit: 'contain'
        }}
      />
    </div>
  )
}
