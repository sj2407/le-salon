import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'
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

function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navigation />
        <Suspense fallback={<div className="container"><div className="loading">Loading...</div></div>}>
        <Routes>
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
            element={
              <ProtectedRoute>
                <Help />
              </ProtectedRoute>
            }
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
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRoutes
