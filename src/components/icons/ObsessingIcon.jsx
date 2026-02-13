import { useRef } from 'react'

export const ObsessingIcon = () => {
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
        animation: 'brainFloat 5.2s ease-in-out infinite'
      }}
    >
      {/* Brain pulse sound - plays on hover */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
      >
        <source src="/sounds/brain-pulse.wav" type="audio/wav" />
      </audio>

      <img
        src="/images/brain-ready.png"
        alt="Brain"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: 'pointer',
          width: '65px',
          height: '65px',
          objectFit: 'contain'
        }}
      />
    </div>
  )
}
