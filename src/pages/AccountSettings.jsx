import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const AccountSettings = () => {
  const { user, refreshProfile } = useAuth()

  // Email state
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '12px', textAlign: 'center' }}>
        Account Settings
      </h1>

      <div className="card" style={{ border: 'none', boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)' }}>
        {/* Change Email */}
        <div style={{ marginBottom: '28px' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Change Email</label>
          <p style={{ fontSize: '13px', color: '#999', marginBottom: '10px' }}>
            Current: {user?.email}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="New email address"
              style={{ flex: 1 }}
            />
            <button
              onClick={async () => {
                if (!newEmail.trim()) return
                setEmailLoading(true)
                setEmailMessage('')
                try {
                  const { error } = await supabase.auth.updateUser(
                    { email: newEmail.trim() },
                    { emailRedirectTo: `${window.location.origin}/account` }
                  )
                  if (error) throw error
                  setEmailMessage('A confirmation link has been sent to your new email. Click it to complete the change.')
                  setNewEmail('')
                } catch (err) {
                  if (err.status === 429 || err.message?.includes('rate limit')) {
                    setEmailMessage('Too many attempts. Please wait a few minutes and try again.')
                  } else {
                    setEmailMessage(err.message || 'Failed to update email')
                  }
                } finally {
                  setEmailLoading(false)
                }
              }}
              disabled={emailLoading || !newEmail.trim()}
              className="primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              {emailLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
          {emailMessage && (
            <p style={{
              fontSize: '13px',
              marginTop: '8px',
              color: emailMessage.includes('confirmation') ? '#4A7BA7' : '#E8534F'
            }}>
              {emailMessage}
            </p>
          )}
        </div>

        {/* Change Password */}
        <div>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Change Password</label>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <button
            onClick={async () => {
              if (newPassword.length < 6) {
                setPasswordMessage('Password must be at least 6 characters')
                return
              }
              if (newPassword !== confirmPassword) {
                setPasswordMessage('Passwords do not match')
                return
              }
              setPasswordLoading(true)
              setPasswordMessage('')
              try {
                const { error } = await supabase.auth.updateUser({ password: newPassword })
                if (error) throw error
                setPasswordMessage('Password updated successfully!')
                setNewPassword('')
                setConfirmPassword('')
              } catch (err) {
                setPasswordMessage(err.message || 'Failed to update password')
              } finally {
                setPasswordLoading(false)
              }
            }}
            disabled={passwordLoading || !newPassword || !confirmPassword}
            className="primary"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
          {passwordMessage && (
            <p style={{
              fontSize: '13px',
              marginTop: '8px',
              color: passwordMessage.includes('successfully') ? '#4A7BA7' : '#E8534F'
            }}>
              {passwordMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
