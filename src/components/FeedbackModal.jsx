import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const FeedbackModal = ({ onClose }) => {
  const { profile } = useAuth()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, submitting])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { error: submitError } = await supabase
        .from('feedback')
        .insert({
          user_id: profile.id,
          content: content.trim()
        })

      if (submitError) throw submitError

      setSubmitted(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        style={{
          background: '#FFFEFA',
          border: '2px solid #2C2C2C',
          borderRadius: '4px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '4px 4px 0 #2C2C2C'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px' }}>
              Thanks for your feedback! 💌
            </h2>
            <p style={{ color: '#777', fontSize: '14px' }}>Closing...</p>
          </div>
        ) : (
          <>
            <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '24px' }}>
              Send Feedback
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">What's on your mind?</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  placeholder="Bug reports, feature ideas, or just say hi..."
                  style={{ minHeight: '120px' }}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="submit"
                  className="primary"
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
