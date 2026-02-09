import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Navigation } from './components/Navigation'
import { Footer } from './components/Footer'
import { SignUp } from './pages/SignUp'
import { SignIn } from './pages/SignIn'
import { Salon } from './pages/Salon'
import { MyCorner } from './pages/MyCorner'
import { ToDo } from './pages/ToDo'
import { PastActivities } from './pages/PastActivities'
import { Friends } from './pages/Friends'
import { FindFriends } from './pages/FindFriends'
import { FriendCard } from './pages/FriendCard'
import { Notifications } from './pages/Notifications'
import { Newsletter } from './pages/Newsletter'
import { AdminFeedback } from './pages/AdminFeedback'
import { Help } from './pages/Help'

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
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRoutes
