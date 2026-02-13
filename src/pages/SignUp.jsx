import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const SignUp = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const { signUp } = useAuth()
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
        navigate('/?tab=profile')
      } else {
        // Email confirmation required — show message
        setConfirmationSent(true)
      }
    } catch (err) {
      console.error('Signup error:', err)
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

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
