import { useRef } from 'react'
import { motion } from 'framer-motion'

export const VinylIcon = ({ className = "section-icon" }) => {
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

      <motion.svg
        className={className}
        viewBox="0 0 100 100"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: 'pointer',
          width: '90px',
          height: '90px'
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {/* Outer vinyl disc - black */}
        <circle cx="50" cy="50" r="45" fill="#1a1a1a" stroke="#2C2C2C" strokeWidth="1.5" />

        {/* Groove lines - subtle gradient circles */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="#2a2a2a" strokeWidth="0.6" opacity="0.6" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#2a2a2a" strokeWidth="0.6" opacity="0.5" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="#2a2a2a" strokeWidth="0.6" opacity="0.5" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#2a2a2a" strokeWidth="0.6" opacity="0.4" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="#2a2a2a" strokeWidth="0.6" opacity="0.4" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="#2a2a2a" strokeWidth="0.6" opacity="0.3" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="#2a2a2a" strokeWidth="0.6" opacity="0.3" />

        {/* Center label - classic vinyl red */}
        <circle cx="50" cy="50" r="14" fill="#C84848" stroke="#2C2C2C" strokeWidth="1.2" />

        {/* Center hole */}
        <circle cx="50" cy="50" r="5" fill="#2C2C2C" />

        {/* Inner label ring detail */}
        <circle cx="50" cy="50" r="11" fill="none" stroke="#2C2C2C" strokeWidth="0.4" opacity="0.4" />

        {/* Subtle reflection/shine on top left */}
        <path
          d="M 30 20 Q 40 15, 50 15 Q 45 20, 40 25"
          fill="white"
          opacity="0.1"
        />
      </motion.svg>
    </div>
  )
}
