import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Welcome } from '../components/onboarding/Welcome'
import { MyCornerTour } from '../components/onboarding/MyCornerTour'
import { ProfileBasics } from '../components/onboarding/ProfileBasics'
import { ShareDemo } from '../components/onboarding/ShareDemo'
import { ShareSheetTip } from '../components/onboarding/ShareSheetTip'
import { PortraitTour } from '../components/onboarding/PortraitTour'
import { ScanAccessExperience, ScanAccessBooks } from '../components/onboarding/ScanAccessDemo'
import { ShareWithFriends } from '../components/onboarding/ShareWithFriends'
import { Closing } from '../components/onboarding/Closing'
import { VideoStep } from '../components/onboarding/VideoStep'

// Step order:
//    0 = Welcome
//    1 = ProfileBasics
//    2 = MyCornerTour          (carousel of the 5 My Corner tabs)
//    3 = ShareDemo
//    4 = ShareSheetTip
//    5 = PortraitTour          (Spotify OAuth resumes here via FinishSetupBanner)
//    6 = ScanAccessExperience  (how to find the playbill scan)
//    7 = ScanAccessBooks       (how to find the bookshelf scan)
//    8 = ShareWithFriends      (Marginalia + Recommend a review)
//    9 = Closing               (Post an activity + send-off line)
//   10 = VideoStep             (closing salon intro before /my-corner)
const STEP_COUNT = 11

export const Onboarding = () => {
  const { user, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isReplay = searchParams.get('mode') === 'replay'

  const [step, setStep] = useState(() => {
    if (isReplay) return 0
    return profile?.onboarding_step ?? 0
  })
  // Async data-check result for direct URL access by users with data.
  // null = inflight, 'allow' | 'bounce' once resolved.
  const [rpcGuard, setRpcGuard] = useState(null)
  const [guardForUserId, setGuardForUserId] = useState(null)
  const currentUserId = user?.id ?? null

  if (guardForUserId !== currentUserId) {
    setGuardForUserId(currentUserId)
    setRpcGuard(null)
  }

  useEffect(() => {
    if (isReplay) return
    if (loading || !user || !profile) return
    if (rpcGuard !== null) return
    if (profile.onboarding_dismissed_at) return
    let cancelled = false
    supabase.rpc('has_meaningful_data', { p_user_id: user.id })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setRpcGuard('allow'); return }
        setRpcGuard(data === true ? 'bounce' : 'allow')
      })
    return () => { cancelled = true }
  }, [isReplay, loading, user, profile, rpcGuard])

  // Derive guard
  let guard
  if (isReplay) guard = 'allow'
  else if (loading || !user || !profile) guard = 'checking'
  else if (profile.onboarding_dismissed_at) guard = 'bounce'
  else guard = rpcGuard ?? 'checking'

  const persistStep = async (next) => {
    if (isReplay) return
    if (!user) return
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_step: next })
        .eq('id', user.id)
      await refreshProfile()
    } catch {
      // Non-fatal
    }
  }

  const goTo = async (next) => {
    setStep(next)
    if (next < STEP_COUNT) await persistStep(next)
  }

  const dismiss = async () => {
    if (!isReplay && user) {
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_dismissed_at: new Date().toISOString() })
          .eq('id', user.id)
        await refreshProfile()
      } catch {
        // Non-fatal
      }
    }
    navigate('/my-corner', { replace: true })
  }

  const finish = async () => {
    if (!isReplay && user) {
      try {
        await supabase
          .from('profiles')
          .update({
            onboarding_step: STEP_COUNT,
            onboarding_dismissed_at: new Date().toISOString()
          })
          .eq('id', user.id)
        await refreshProfile()
      } catch {
        // Non-fatal
      }
    }
    // Mark the App splash as already played for this session. the closing
    // VideoStep IS the splash. Without this, App.jsx would fire it again on
    // /my-corner mount.
    try {
      sessionStorage.setItem('salon-intro-played', '1')
    } catch {
      // Non-fatal
    }
    navigate('/my-corner', { replace: true })
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/signin" replace />
  }
  if (guard === 'checking') {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    )
  }
  if (guard === 'bounce') {
    return <Navigate to="/my-corner" replace />
  }

  return (
    <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
      <AnimatePresence mode="wait">
        <Motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <Welcome
              onBegin={() => goTo(1)}
              onSkip={dismiss}
            />
          )}
          {step === 1 && (
            <ProfileBasics
              onContinue={() => goTo(2)}
              onSkip={() => goTo(2)}
            />
          )}
          {step === 2 && (
            <MyCornerTour onContinue={() => goTo(3)} />
          )}
          {step === 3 && (
            <ShareDemo onContinue={() => goTo(4)} />
          )}
          {step === 4 && (
            <ShareSheetTip onContinue={() => goTo(5)} />
          )}
          {step === 5 && (
            <PortraitTour
              onContinue={() => goTo(6)}
              onResumeStepBeforeRedirect={() => persistStep(5)}
            />
          )}
          {step === 6 && (
            <ScanAccessExperience onContinue={() => goTo(7)} />
          )}
          {step === 7 && (
            <ScanAccessBooks onContinue={() => goTo(8)} />
          )}
          {step === 8 && (
            <ShareWithFriends onContinue={() => goTo(9)} />
          )}
          {step === 9 && (
            <Closing onContinue={() => goTo(10)} />
          )}
          {step === 10 && (
            <VideoStep onFinish={finish} />
          )}
        </Motion.div>
      </AnimatePresence>
    </div>
  )
}
