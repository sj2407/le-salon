import { useState } from 'react'
import { FeedbackModal } from './FeedbackModal'

export const Footer = () => {
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <>
      <footer
        style={{
          borderTop: '1px solid #E8E8E8',
          padding: '24px 0',
          marginTop: '80px',
          textAlign: 'center'
        }}
      >
        <div className="container">
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4A7BA7',
              fontSize: '14px',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0
            }}
          >
            Send Feedback
          </button>
        </div>
      </footer>

      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
    </>
  )
}
