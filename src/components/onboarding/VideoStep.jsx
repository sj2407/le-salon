import { useEffect, useRef } from 'react'

// Step 8 (final): Le Salon intro video. Plays inline as the welcome beat
// before the user lands in My Corner. Mirrors the App splash visuals so
// veterans recognize it.
//
// onFinish fires on video end OR Skip OR a 10s safety timeout.
export const VideoStep = ({ onFinish }) => {
  const videoRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(onFinish, 10000)
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'url(/images/parchment-video-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      zIndex: 50,
    }}>
      <video
        ref={videoRef}
        src="/salon-intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={onFinish}
        style={{
          maxWidth: '90vw',
          maxHeight: '60vh',
          objectFit: 'contain',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent), linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
          WebkitMaskComposite: 'destination-in',
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent), linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
          maskComposite: 'intersect',
        }}
      />
      <button
        onClick={onFinish}
        style={{
          position: 'absolute',
          bottom: '40px',
          background: 'none',
          border: 'none',
          color: 'rgba(98,39,34,0.75)',
          fontFamily: "'Caveat', cursive",
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        Skip
      </button>
    </div>
  )
}
