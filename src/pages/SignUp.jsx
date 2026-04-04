import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

export const SignUp = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const { signUp, signInWithOAuthProvider, signInWithApple } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const username = displayName.toLowerCase().replace(/\s+/g, '_')
      const result = await signUp(email, password, displayName, username)

      // If session exists, email confirmation is disabled — navigate directly
      if (result.session) {
        navigate('/my-corner')
      } else {
        // Email confirmation required — show message
        setConfirmationSent(true)
      }
    } catch (err) {
      if (err.message?.includes('already been registered') || err.message?.includes('Database error saving new user') || err.message?.includes('already exists')) {
        setError('This email is already registered. Try signing in instead.')
      } else {
        setError(err.message || 'Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  if (confirmationSent) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1 className="auth-title">Le Salon</h1>
          <p style={{ fontSize: '16px', color: '#2C2C2C', marginBottom: '12px' }}>
            Check your email
          </p>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <p style={{ fontSize: '13px', color: '#999', marginTop: '16px' }}>
            Don't see it? Check your spam folder.
          </p>
          <Link to="/signin" style={{ display: 'inline-block', marginTop: '20px', fontSize: '14px', color: '#4A7BA7' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Join Le Salon</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Soumi"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="[email protected]"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                style={{ paddingRight: '45px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '14px',
                  color: '#777'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="primary" disabled={loading} style={{ width: '100%', marginTop: '16px' }}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          onClick={async () => {
            setError('')
            try { await signInWithApple() } catch (err) { setError(err.message) }
          }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', height: '48px', backgroundColor: '#000', color: '#fff',
            border: 'none', borderRadius: '12px', fontSize: '16px',
            fontFamily: '-apple-system, SF Pro, system-ui, sans-serif',
            fontWeight: 500, cursor: 'pointer', marginBottom: '10px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.3-3.74 4.25z"/>
          </svg>
          Sign up with Apple
        </button>

        <button
          type="button"
          className="google-btn"
          onClick={async () => {
            setError('')
            try { await signInWithOAuthProvider('google') } catch (err) { setError(err.message) }
          }}
        >
          <GoogleIcon />
          Sign up with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
