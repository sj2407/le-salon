// Ensures a share token exists and is stored in the App Group for the Share Extension.
// Runs once per session on native platforms. No-op on web.

import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { setAppGroupValue } from '../lib/appGroup'

export function useShareTokenSync(user) {
  const didSync = useRef(false)

  useEffect(() => {
    if (!user || didSync.current || !Capacitor.isNativePlatform()) return
    didSync.current = true

    syncToken(user.id)
  }, [user])
}

async function syncToken(userId) {
  try {
    // Check if user already has an active token
    const { data: existing } = await supabase
      .from('share_tokens')
      .select('id, token_hash')
      .eq('user_id', userId)
      .eq('revoked', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      // Token exists in DB but we don't have the raw token (it's hashed).
      // Check if App Group already has a token stored.
      const { getAppGroupValue } = await import('../lib/appGroup')
      const stored = await getAppGroupValue('share_token')
      if (stored) return // Already synced
      // App Group is empty but DB has a token — user needs to regenerate.
      // Auto-generate a fresh one.
    }

    // Generate a new token and store it
    const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken))
    const hashHex = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('')

    const { error } = await supabase
      .from('share_tokens')
      .insert({
        user_id: userId,
        token_hash: hashHex,
        label: 'iOS App',
      })

    if (error) {
      // Might fail if user already has 3 tokens — that's ok, revoke oldest
      if (error.message?.includes('duplicate') || error.code === '23505') return
      console.error('Failed to create share token:', error)
      return
    }

    await setAppGroupValue('share_token', rawToken)
  } catch (err) {
    console.error('Share token sync error:', err)
  }
}
