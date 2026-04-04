import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { getNotificationRoute } from '../lib/notificationUtils'

/**
 * Registers for push notifications on native platforms.
 * - Requests permission
 * - Saves device token to device_tokens table
 * - Handles notification tap → navigates to the correct screen
 * - Re-runs when user changes (handles logout/login with different account)
 */
export function usePushNotifications(user, navigate, introPlayed = true) {
  // Store navigate in a ref so the effect doesn't re-run when navigate changes reference
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    // Wait for intro video to finish before requesting push permissions
    if (!user || !Capacitor.isNativePlatform() || !introPlayed) return

    let pushPlugin
    let cancelled = false

    async function setup() {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      if (cancelled) return
      pushPlugin = PushNotifications

      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions()

      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        const result = await PushNotifications.requestPermissions()
        if (result.receive !== 'granted') {
          console.log('Push notification permission denied')
          return
        }
      } else if (permStatus.receive !== 'granted') {
        console.log('Push notifications not granted:', permStatus.receive)
        return
      }

      // Register listeners BEFORE calling register() to avoid race condition
      await PushNotifications.addListener('registration', async (token) => {
        if (cancelled) return
        console.log('Push token received')
        const { error } = await supabase
          .from('device_tokens')
          .upsert(
            { user_id: user.id, token: token.value, platform: 'ios' },
            { onConflict: 'user_id,token' }
          )
        if (error) console.error('Failed to save device token:', error)
      })

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration failed:', err)
      })

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        const data = notification.notification?.data
        if (data?.type) {
          const route = getNotificationRoute(data)
          if (route) navigateRef.current(route)
        }
      })

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received in foreground:', notification.title)
      })

      // Now register with APNs — listeners are already attached
      await PushNotifications.register()
    }

    setup().catch((err) => console.error('Push setup failed:', err))

    return () => {
      cancelled = true
      if (pushPlugin) {
        pushPlugin.removeAllListeners()
      }
    }
  }, [user, introPlayed])
}
