import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Decides whether to send a fresh user into the onboarding flow.
// Returns one of:
//   'pending'   . auth still loading or RPC inflight; gate UI on this
//   'redirect'  . empty user, never dismissed → caller should navigate('/onboarding')
//   'allow'     . user has data OR has dismissed; render normally
//
// Runs the RPC at most once per user.id, gated on profile being loaded so we
// don't read a stale onboarding_dismissed_at from a missing row.
export function useOnboardingTrigger() {
  const { user, profile, loading } = useAuth()
  const [rpcResult, setRpcResult] = useState(null)
  const [resultForUserId, setResultForUserId] = useState(null)
  const currentUserId = user?.id ?? null

  // Reset cached RPC result when the user changes (logout/login flip).
  if (resultForUserId !== currentUserId) {
    setResultForUserId(currentUserId)
    setRpcResult(null)
  }

  useEffect(() => {
    if (loading || !user || !profile) return
    if (profile.onboarding_dismissed_at) return
    if (rpcResult !== null) return
    let cancelled = false
    supabase.rpc('has_meaningful_data', { p_user_id: user.id })
      .then(({ data, error }) => {
        if (cancelled) return
        // Fail open on transient RPC error. never block existing users.
        if (error) { setRpcResult('allow'); return }
        setRpcResult(data === false ? 'redirect' : 'allow')
      })
    return () => { cancelled = true }
  }, [user, profile, loading, rpcResult])

  if (loading) return 'pending'
  if (!user) return 'allow'
  if (!profile) return 'pending'
  if (profile.onboarding_dismissed_at) return 'allow'
  return rpcResult ?? 'pending'
}
