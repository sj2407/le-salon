import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { getRedirectUrl } from '../lib/redirectUrl'
import { setAppGroupValue } from '../lib/appGroup'
import { ConfirmModal } from '../components/ConfirmModal'

export const AccountSettings = () => {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // Email state
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')

  // Share token state
  const [shareTokens, setShareTokens] = useState([])
  const [newlyGeneratedToken, setNewlyGeneratedToken] = useState(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  // Delete account state
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmState, setConfirmState] = useState(null)

  useEffect(() => {
    if (user) fetchShareTokens()
  }, [user])

  const fetchShareTokens = async () => {
    const { data } = await supabase
      .from('share_tokens')
      .select('id, token_hash, last_used_at, created_at, revoked, expires_at')
      .eq('user_id', user.id)
      .eq('revoked', false)
      .order('created_at', { ascending: false })
    if (data) setShareTokens(data)
  }

  const generateToken = async () => {
    setTokenLoading(true)
    try {
      const { count } = await supabase
        .from('share_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('revoked', false)
      if (count >= 3) {
        toast.error('Maximum 3 active tokens. Revoke one first.')
        return
      }

      const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
      const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken))
      const hashHex = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('')

      const { error } = await supabase
        .from('share_tokens')
        .insert({
          user_id: user.id,
          token_hash: hashHex,
          label: 'iOS Shortcut',
        })

      if (error) throw error

      setNewlyGeneratedToken(rawToken)
      // Store in App Group so Share Extension can access it
      await setAppGroupValue('share_token', rawToken)
      await fetchShareTokens()
      toast.success('Share token generated')
    } catch {
      toast.error('Failed to generate token')
    } finally {
      setTokenLoading(false)
    }
  }

  const regenerateToken = (tokenId) => {
    setConfirmState({
      message: 'This will invalidate your current token. Continue?',
      confirmText: 'Continue',
      destructive: false,
      onConfirm: async () => {
        try {
          const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
          const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken))
          const hashHex = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('')

          const { error } = await supabase
            .from('share_tokens')
            .update({ token_hash: hashHex, last_used_at: null })
            .eq('id', tokenId)
          if (error) throw error

          setNewlyGeneratedToken(rawToken)
          await setAppGroupValue('share_token', rawToken)
          await fetchShareTokens()
          toast.success('Token regenerated — copy the new token below')
        } catch {
          toast.error('Failed to regenerate token')
        }
      }
    })
  }

  const revokeToken = (tokenId) => {
    setConfirmState({
      message: 'Revoke this token? Your iOS Shortcut will stop working until you generate a new one.',
      confirmText: 'Revoke',
      destructive: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('share_tokens')
            .update({ revoked: true })
            .eq('id', tokenId)
          if (error) throw error
          await fetchShareTokens()
          setNewlyGeneratedToken(null)
          toast.success('Token revoked')
        } catch {
          toast.error('Failed to revoke token')
        }
      }
    })
  }

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
                    { emailRedirectTo: getRedirectUrl('/account') }
                  )
                  if (error) throw error
                  setEmailMessage('A confirmation link has been sent to your new email. Click it to complete the change.')
                  toast.success('Confirmation email sent')
                  setNewEmail('')
                } catch (err) {
                  if (err.status === 429 || err.message?.includes('rate limit')) {
                    setEmailMessage('Too many attempts. Please wait a few minutes and try again.')
                    toast.error('Too many attempts. Wait a few minutes.')
                  } else {
                    setEmailMessage(err.message || 'Failed to update email')
                    toast.error('Failed to update email')
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
                toast.success('Password updated')
                setNewPassword('')
                setConfirmPassword('')
              } catch (err) {
                setPasswordMessage(err.message || 'Failed to update password')
                toast.error('Failed to update password')
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

        {/* Delete Account */}
        <div style={{ marginTop: '28px', borderTop: '1px dashed #D4C9B8', paddingTop: '28px' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block', color: '#C75D5D' }}>
            Delete Account
          </label>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                background: 'none',
                border: '1px solid #C75D5D',
                color: '#C75D5D',
                padding: '8px 16px',
                borderRadius: '3px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Delete My Account
            </button>
          ) : (
            <div style={{
              padding: '16px',
              background: '#FDF2F2',
              borderRadius: '3px',
            }}>
              <p style={{ fontSize: '13px', color: '#8B3A3A', marginBottom: '12px', lineHeight: 1.5 }}>
                This will permanently delete your account and all your data — books, reviews, cards, activities, and everything else. This cannot be undone.
              </p>
              <p style={{ fontSize: '13px', color: '#8B3A3A', marginBottom: '8px' }}>
                Type <strong>DELETE</strong> to confirm:
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  style={{ flex: 1, fontSize: '16px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={async () => {
                    if (deleteConfirmText !== 'DELETE') return
                    setDeleteLoading(true)
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      const res = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
                        {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                          },
                        }
                      )
                      if (!res.ok) {
                        const body = await res.json()
                        throw new Error(body.error || 'Deletion failed')
                      }
                      sessionStorage.clear()
                      await supabase.auth.signOut()
                      navigate('/signin')
                    } catch (err) {
                      toast.error(err.message || 'Failed to delete account')
                      setDeleteLoading(false)
                    }
                  }}
                  disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                  style={{
                    background: deleteConfirmText === 'DELETE' ? '#C75D5D' : '#DDD',
                    color: '#FFF',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '3px',
                    fontSize: '14px',
                    cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                  }}
                >
                  {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }}
                  style={{
                    background: 'none',
                    border: '1px solid #D4C9B8',
                    padding: '8px 16px',
                    borderRadius: '3px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: '#555',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Share to Le Salon — admin only until native app ships */}
        {user?.id === '2c90c849-f767-443e-a0e3-1d1438eac6f4' && <div style={{ marginTop: '28px', borderTop: '1px dashed #D4C9B8', paddingTop: '28px' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
            Share to Le Salon
          </label>
          <p style={{ fontSize: '13px', color: '#999', marginBottom: '12px', lineHeight: 1.5 }}>
            Share links from your phone directly to Le Salon using an iOS Shortcut.
            Generate a personal token below, then install the Shortcut.
          </p>

          {/* Existing tokens */}
          {shareTokens.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              {shareTokens.map(t => (
                <div key={t.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#F5F0EB',
                  borderRadius: '3px',
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <div>
                    <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                      {t.token_hash.slice(0, 8)}...
                    </span>
                    <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>
                      {t.last_used_at ? `Last used ${new Date(t.last_used_at).toLocaleDateString()}` : 'Never used'}
                    </span>
                    {t.expires_at && (
                      <span style={{ fontSize: '11px', color: new Date(t.expires_at) < new Date() ? '#C75D5D' : '#999', marginLeft: '8px' }}>
                        {new Date(t.expires_at) < new Date() ? 'Expired' : `Expires ${new Date(t.expires_at).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => regenerateToken(t.id)}
                      style={{
                        background: 'none',
                        border: '1px solid #D4C9B8',
                        borderRadius: '3px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        color: '#555',
                      }}
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={() => revokeToken(t.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#C75D5D',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generate new token */}
          {!newlyGeneratedToken ? (
            <button
              onClick={generateToken}
              disabled={tokenLoading}
              className="primary"
              style={{ marginBottom: '12px' }}
            >
              {tokenLoading ? 'Generating...' : 'Generate Token'}
            </button>
          ) : (
            <div style={{
              padding: '12px',
              background: '#F0F8F0',
              borderRadius: '3px',
              marginBottom: '12px',
            }}>
              <p style={{ fontSize: '13px', color: '#5C6B4A', fontWeight: 600, marginBottom: '6px' }}>
                Token generated! Copy it now — it won't be shown again.
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <code style={{
                  flex: 1,
                  fontSize: '11px',
                  background: '#FFFEFA',
                  padding: '8px',
                  borderRadius: '3px',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  border: '1px solid #D4C9B8',
                }}>
                  {newlyGeneratedToken}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newlyGeneratedToken)
                    toast.success('Token copied!')
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#622722',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* iOS Shortcut instructions */}
          <div style={{
            padding: '12px',
            background: '#F5F0EB',
            borderRadius: '3px',
            fontSize: '13px',
            color: '#555',
            lineHeight: 1.6,
          }}>
            <strong style={{ color: '#2C2C2C' }}>Setup Instructions:</strong>
            <ol style={{ paddingLeft: '20px', margin: '8px 0 0' }}>
              <li>Tap "Generate Token" above and copy it</li>
              <li>On your iPhone, open the Shortcuts app</li>
              <li>Create a new Shortcut that accepts URLs from the Share Sheet</li>
              <li>Add a "Get Contents of URL" action pointing to your Le Salon endpoint</li>
              <li>Set the Authorization header to "Bearer" + your token</li>
              <li>To use: from any app, tap Share → your Shortcut name</li>
            </ol>
          </div>
        </div>}
      </div>

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => { await confirmState?.onConfirm(); setConfirmState(null) }}
        title="Confirm"
        message={confirmState?.message || ''}
        confirmText={confirmState?.confirmText || 'Confirm'}
        destructive={confirmState?.destructive ?? true}
      />
    </div>
  )
}
