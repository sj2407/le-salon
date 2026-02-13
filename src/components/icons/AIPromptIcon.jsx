import { useRef } from 'react'

export const AIPromptIcon = () => {
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
        animation: 'robotFloat 3.5s ease-in-out infinite'
      }}
    >
      {/* Robot beep sound - plays on hover */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
      >
        <source src="/sounds/robot-beep.wav" type="audio/wav" />
      </audio>

      <img
        src="/images/robot-ready.png"
        alt="Robot"
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
