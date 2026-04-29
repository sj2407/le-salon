import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

// Persistent banner shown atop My Corner when a user bailed mid-onboarding.
// Tap → resume from saved onboarding_step. Dismiss → set onboarding_dismissed_at.
export const FinishSetupBanner = () => {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [hidden, setHidden] = useState(false)

  const shouldShow =
    !!profile &&
    (profile.onboarding_step ?? 0) > 0 &&
    !profile.onboarding_dismissed_at &&
    !hidden

  const handleResume = () => {
    navigate('/onboarding')
  }

  const handleDismiss = async (e) => {
    e.stopPropagation()
    setHidden(true)
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_dismissed_at: new Date().toISOString() })
        .eq('id', user.id)
      await refreshProfile()
    } catch {
      // Silent. local hide already applied
    }
  }

  return (
    <AnimatePresence>
      {shouldShow && (
        <Motion.div
          key="finish-setup"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          onClick={handleResume}
          style={{
            margin: '8px 10px 4px',
            background: '#FFFEFA',
            borderRadius: '6px',
            padding: '10px 14px',
            boxShadow: '2px 3px 10px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#777',
              marginBottom: '2px',
            }}>
              Finish setup
            </div>
            <div style={{ fontSize: '14px', color: '#2C2C2C', lineHeight: 1.3 }}>
              Pick up the tour where you left off.
            </div>
          </div>
          <button
            onClick={handleResume}
            style={{
              background: '#622722',
              color: '#FFFEFA',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 14px',
              fontFamily: 'inherit',
              fontSize: '13px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Resume
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '0 4px',
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </Motion.div>
      )}
    </AnimatePresence>
  )
}
