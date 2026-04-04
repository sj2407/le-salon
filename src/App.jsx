import { lazy, Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { supabase } from './lib/supabase'
import { Navigation } from './components/Navigation'
import { BottomTabBar } from './components/BottomTabBar'
import { Footer } from './components/Footer'
import { useShareTokenSync } from './hooks/useShareTokenSync'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useBiometricLock } from './hooks/useBiometricLock'
import { LockScreen } from './components/LockScreen'
import { ShareNotificationBanner } from './components/ShareNotificationBanner'
import { SignUp } from './pages/SignUp'
import { SignIn } from './pages/SignIn'

// Lazy-load all pages behind routes — only downloaded when visited
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })))
const Salon = lazy(() => import('./pages/Salon').then(m => ({ default: m.Salon })))
const MyCorner = lazy(() => import('./pages/MyCorner').then(m => ({ default: m.MyCorner })))
const ToDo = lazy(() => import('./pages/ToDo').then(m => ({ default: m.ToDo })))
const PastActivities = lazy(() => import('./pages/PastActivities').then(m => ({ default: m.PastActivities })))
const Friends = lazy(() => import('./pages/Friends').then(m => ({ default: m.Friends })))
const FindFriends = lazy(() => import('./pages/FindFriends').then(m => ({ default: m.FindFriends })))
const FriendCard = lazy(() => import('./pages/FriendCard').then(m => ({ default: m.FriendCard })))
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })))
const Newsletter = lazy(() => import('./pages/Newsletter').then(m => ({ default: m.Newsletter })))
const AdminFeedback = lazy(() => import('./pages/AdminFeedback').then(m => ({ default: m.AdminFeedback })))
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })))
const AccountSettings = lazy(() => import('./pages/AccountSettings').then(m => ({ default: m.AccountSettings })))
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })))

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

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

  return children
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  // Intro video — hoisted here so it renders BEFORE Suspense/lazy load
  const [introPlayed, setIntroPlayed] = useState(() => !!sessionStorage.getItem('salon-intro-played'))
  const introVideoRef = useRef(null)
  const handleIntroDone = useCallback(() => {
    setIntroPlayed(true)
    sessionStorage.setItem('salon-intro-played', '1')
  }, [])

  useShareTokenSync(user)
  usePushNotifications(user, navigate, introPlayed)
  const { isLocked, unlock } = useBiometricLock(user)

  // Handle OAuth redirects from system browser back to native app (Universal Links)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let appPlugin
    const setup = async () => {
      const { App: AppPlugin } = await import('@capacitor/app')
      appPlugin = AppPlugin
      await appPlugin.addListener('appUrlOpen', async ({ url }) => {
        const { Browser } = await import('@capacitor/browser')
        Browser.close()
        const urlObj = new URL(url)
        const code = urlObj.searchParams.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }
      })
    }
    setup()

    return () => {
      if (appPlugin) appPlugin.removeAllListeners()
    }
  }, [])

  // Scroll container ref — used by onExitComplete to reset scroll on route change
  const scrollRef = useRef(null)


  // Global listener: notify user on any page when a share arrives
  const [shareNotification, setShareNotification] = useState(null)
  const shareCountRef = useRef(0)

  useEffect(() => {
    if (!user) return
    let channel
    let cancelled = false

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
      shareCountRef.current = 0
      channel = supabase
        .channel('global-share-notify')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'pending_shares',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          shareCountRef.current += 1
          const count = shareCountRef.current
          const title = count > 1
            ? `${count} items shared`
            : (payload.new?.ai_extracted_fields?.title || 'New item shared')
          setShareNotification({ title })
        })
        .subscribe()
    }
    setup()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [user])

  // Auto-skip intro after 10 seconds
  useEffect(() => {
    if (user && !introPlayed) {
      const timer = setTimeout(handleIntroDone, 10000)
      return () => clearTimeout(timer)
    }
  }, [user, introPlayed, handleIntroDone])

  // Intro splash — renders as portal ABOVE everything, before lazy chunks load
  if (user && !introPlayed) {
    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'url(/images/parchment-video-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <video
          ref={introVideoRef}
          src="/salon-intro.mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleIntroDone}
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
          onClick={handleIntroDone}
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
      </div>,
      document.body
    )
  }

  return (
    <div className="app-shell">
      {isLocked && <LockScreen onUnlock={unlock} />}
      <Navigation />
      <div className="app-scroll-content" ref={scrollRef}>
      <AnimatePresence mode="wait" onExitComplete={() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
      }}>
        <Motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Suspense fallback={<div className="container"><div className="loading">Loading...</div></div>}>
          <Routes location={location}>
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              }
            />
            <Route
              path="/signin"
              element={
                <PublicRoute>
                  <SignIn />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Salon />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-corner"
              element={
                <ProtectedRoute>
                  <MyCorner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/todo"
              element={
                <ProtectedRoute>
                  <ToDo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/todo/past"
              element={
                <ProtectedRoute>
                  <PastActivities />
                </ProtectedRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <ProtectedRoute>
                  <Friends />
                </ProtectedRoute>
              }
            />
            <Route
              path="/find-friends"
              element={
                <ProtectedRoute>
                  <FindFriends />
                </ProtectedRoute>
              }
            />
            <Route
              path="/friend/:friendId"
              element={
                <ProtectedRoute>
                  <FriendCard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/newsletter"
              element={
                <ProtectedRoute>
                  <Newsletter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/help"
              element={<Help />}
            />
            <Route
              path="/privacy"
              element={<Privacy />}
            />
            <Route
              path="/admin/feedback"
              element={
                <ProtectedRoute>
                  <AdminFeedback />
                </ProtectedRoute>
              }
            />
          </Routes>
          </Suspense>
        </Motion.div>
      </AnimatePresence>
      <Footer />
      </div>
      <BottomTabBar />
      <ShareNotificationBanner
        notification={shareNotification}
        onTap={() => {
          setShareNotification(null)
          shareCountRef.current = 0
          navigate('/', { state: { reviewShares: Date.now() } })
        }}
        onDismiss={() => {
          setShareNotification(null)
          shareCountRef.current = 0
        }}
      />
    </div>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default AppRoutes
