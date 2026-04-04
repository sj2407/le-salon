import { useEffect, useRef } from 'react'

/**
 * Full-screen lock overlay — shown when the app resumes from background.
 * Auto-triggers Face ID once on mount, then user can tap "Unlock" to retry.
 */
export function LockScreen({ onUnlock }) {
  const hasAutoTriggered = useRef(false)

  // Auto-trigger biometric prompt once when lock screen first appears.
  // The guard prevents re-triggering if React re-renders the component.
  useEffect(() => {
    if (hasAutoTriggered.current) return
    hasAutoTriggered.current = true
    // Small delay to let the lock screen render before showing Face ID prompt
    const timer = setTimeout(onUnlock, 300)
    return () => clearTimeout(timer)
  }, [onUnlock])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100000,
      background: '#1a0f0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
    }}>
      <div style={{
        fontSize: '48px',
        lineHeight: 1,
      }}>
        🔒
      </div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        color: '#FFFEFA',
        fontSize: '22px',
        fontWeight: 600,
        margin: 0,
      }}>
        Le Salon is Locked
      </h2>
      <p style={{
        color: 'rgba(255,254,250,0.6)',
        fontSize: '14px',
        margin: 0,
        textAlign: 'center',
        maxWidth: '260px',
      }}>
        Tap to unlock with Face ID or your passcode
      </p>
      <button
        onClick={onUnlock}
        style={{
          marginTop: '12px',
          padding: '12px 32px',
          background: '#622722',
          color: '#FFFEFA',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontFamily: "'Playfair Display', serif",
          cursor: 'pointer',
        }}
      >
        Unlock
      </button>
    </div>
  )
}
