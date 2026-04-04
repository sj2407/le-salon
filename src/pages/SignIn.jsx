import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getRedirectUrl } from '../lib/redirectUrl'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)


export const SignIn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')

  const { signIn, signInWithOAuthProvider, signInWithApple } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Le Salon</h1>
        <form onSubmit={handleSubmit}>
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={async () => {
              const resetEmail = email.trim()
              if (!resetEmail) {
                setError('Enter your email above, then click Forgot password')
                return
              }
              setForgotLoading(true)
              setForgotMessage('')
              setError('')
              const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: getRedirectUrl('/reset-password')
              })
              if (resetError?.status === 429 || resetError?.message?.includes('rate limit')) {
                setForgotMessage('Too many attempts. Please wait a few minutes and try again.')
              } else {
                setForgotMessage('If an account exists for this email, a reset link has been sent. Check your inbox and spam.')
              }
              setForgotLoading(false)
            }}
            disabled={forgotLoading}
            style={{
              background: 'none',
              border: 'none',
              color: '#4A7BA7',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {forgotLoading ? 'Sending...' : 'Forgot password?'}
          </button>
        </div>

        {forgotMessage && (
          <p style={{
            fontSize: '13px',
            marginTop: '12px',
            textAlign: 'center',
            color: '#4A7BA7',
            padding: '12px 16px',
            background: '#F9F7F3',
            borderRadius: '3px'
          }}>
            {forgotMessage}
          </p>
        )}

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
          Sign in with Apple
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
          Sign in with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
