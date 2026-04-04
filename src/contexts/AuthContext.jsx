import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { getRedirectUrl } from '../lib/redirectUrl'

const AuthContext = createContext({})

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const currentUserIdRef = useRef(null)

  useEffect(() => {
    // PKCE code exchange: if any page loads with ?code=XXX, exchange it for a session.
    // This handles password reset, email change confirmation, and signup verification on web.
    // The onAuthStateChange listener (below) will pick up the resulting session.
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      window.history.replaceState({}, '', window.location.pathname)
      supabase.auth.exchangeCodeForSession(code)
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user?.id ?? null
      currentUserIdRef.current = userId
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes — skip token refreshes that don't change the user
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id ?? null

      // Token refresh for same user (e.g. tab switch) — don't update state
      // Allow SIGNED_IN events through even for same user (needed for PKCE code exchange)
      if (event === 'TOKEN_REFRESHED' && newUserId === currentUserIdRef.current) return

      currentUserIdRef.current = newUserId
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, displayName, username) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, username }
      }
    })

    if (authError) throw authError

    // Profile is created automatically by database trigger (handle_new_user)
    // If session exists (email confirmation disabled), set profile immediately
    if (authData.session) {
      const profileData = { id: authData.user.id, email, display_name: displayName, username }
      setProfile(profileData)
      setLoading(false)
    }

    return authData
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  const signInWithOAuthProvider = async (provider) => {
    const redirectUrl = getRedirectUrl()

    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true }
      })
      if (error) throw error
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: data.url })
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl }
      })
      if (error) throw error
    }
  }

  const signInWithApple = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback: use OAuth redirect
      return signInWithOAuthProvider('apple')
    }

    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')
    const result = await SignInWithApple.authorize({
      clientId: 'app.lesalon',
      redirectURI: '',
      scopes: 'email name',
    })

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: result.response.identityToken,
    })
    if (error) throw error

    // Apple only provides name on FIRST sign-in — save immediately
    if (result.response.givenName || result.response.familyName) {
      const fullName = [result.response.givenName, result.response.familyName]
        .filter(Boolean).join(' ')
      await supabase.auth.updateUser({ data: { full_name: fullName } })
      if (data.user) {
        await supabase.from('profiles').update({ display_name: fullName }).eq('id', data.user.id)
      }
    }

    return data
  }

  const signOut = async () => {
    // Clean up device push token before signing out (privacy: prevents
    // the next user on this device from receiving the previous user's pushes)
    if (Capacitor.isNativePlatform() && user) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        // Remove all tokens for this user on this device
        await supabase.from('device_tokens').delete().eq('user_id', user.id)
        await PushNotifications.removeAllListeners()
      } catch {
        // Non-fatal — don't block logout if cleanup fails
      }
    }
    sessionStorage.removeItem('salon-intro-played')
    sessionStorage.removeItem('salon-biometric-unlocked')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithOAuthProvider,
    signInWithApple,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
