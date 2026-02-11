import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const SignIn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')

  const { signIn} = useAuth()
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
              try {
                await supabase.auth.resetPasswordForEmail(resetEmail, {
                  redirectTo: `${window.location.origin}/reset-password`
                })
              } catch {
                // Ignore errors to prevent email enumeration
              }
              setForgotMessage('If an account exists for this email, a reset link has been sent. Check your inbox and spam.')
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

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
