import { useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Biometric app lock — prompts Face ID / Touch ID once on cold app launch.
 * Returns { isLocked, unlock } for the UI to show a lock screen.
 * On web or devices without biometrics, isLocked is always false.
 *
 * Uses sessionStorage to track if the user has already authenticated this session.
 * Cold launch = fresh WKWebView = empty sessionStorage = Face ID prompt.
 * Background/foreground resume = sessionStorage persists = no prompt.
 *
 * Plugin: @capgo/capacitor-native-biometric (Capacitor 7 compatible via SPM).
 */
const SESSION_KEY = 'salon-biometric-unlocked'

export function useBiometricLock(user) {
  const [isLocked, setIsLocked] = useState(false)
  const pluginRef = useRef(null)

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return

    let cancelled = false

    async function setup() {
      // Already unlocked this session — skip
      if (sessionStorage.getItem(SESSION_KEY)) return

      try {
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
        if (cancelled) return
        pluginRef.current = NativeBiometric

        const result = await NativeBiometric.isAvailable({ useFallback: true })
        if (cancelled || !result.isAvailable) return

        // Lock immediately — LockScreen will auto-trigger Face ID
        setIsLocked(true)
      } catch (err) {
        console.error('Biometric setup failed:', err)
      }
    }

    setup()

    return () => {
      cancelled = true
    }
  }, [user])

  const unlock = useCallback(async () => {
    if (!pluginRef.current) {
      setIsLocked(false)
      sessionStorage.setItem(SESSION_KEY, '1')
      return
    }

    try {
      await pluginRef.current.verifyIdentity({
        reason: 'Unlock Le Salon',
        useFallback: true,
      })
      setIsLocked(false)
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch (err) {
      // User cancelled or failed — stay locked
      console.log('Biometric auth failed/cancelled:', err)
    }
  }, [])

  return { isLocked, unlock }
}
