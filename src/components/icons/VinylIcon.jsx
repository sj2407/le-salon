import { useRef } from 'react'

export const VinylIcon = () => {
  const audioRef = useRef(null)

  const handleMouseEnter = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0 // Reset to start
      audioRef.current.play()
    }
  }

  const handleMouseLeave = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0 // Reset for next hover
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        animation: 'vinylFloat 6s ease-in-out infinite'
      }}
    >
      {/* Vinyl crackle audio - plays on hover */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
      >
        <source src="/sounds/vinyl-crackle.wav" type="audio/wav" />
      </audio>

      <img
        src="/images/vinyl-ready.png"
        alt="Vinyl"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: 'pointer',
          width: '90px',
          height: '90px',
          objectFit: 'contain'
        }}
      />
    </div>
  )
}
