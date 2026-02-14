import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ResponseEntry } from './ResponseEntry'

/**
 * Full-screen overlay styled as a notebook page.
 * Accessed via the typewriter FAB. Entries are reverse-chronological (newest first).
 */
export const CommonplaceBook = ({ isOpen, onClose, entries, userId, onSubmit, onEdit, onDelete }) => {
  const [inputText, setInputText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef(null)

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Focus textarea when opening
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Small delay for animation
      setTimeout(() => textareaRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    const trimmed = inputText.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    try {
      if (editingId) {
        await onEdit(editingId, trimmed)
        setEditingId(null)
      } else {
        await onSubmit(trimmed)
      }
      setInputText('')
    } catch {
      // silently handled
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (entry) => {
    setInputText(entry.text)
    setEditingId(entry.id)
    if (textareaRef.current) textareaRef.current.focus()
  }

  const handleCancelEdit = () => {
    setInputText('')
    setEditingId(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setInputText('')
      setEditingId(null)
    }
  }, [isOpen])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <Motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#FFFEFA',
            zIndex: 9999,
            overflowY: 'auto',
            // Subtle lined-paper effect
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(173, 200, 220, 0.12) 31px, rgba(173, 200, 220, 0.12) 32px)',
            backgroundSize: '100% 32px'
          }}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h2
                className="handwritten"
                style={{
                  fontSize: '32px',
                  color: '#2C2C2C',
                  margin: 0
                }}
              >
                The Commonplace Book
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#999',
                  padding: '4px 8px',
                  lineHeight: 1
                }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Subtitle */}
            <p style={{
              fontStyle: 'italic',
              fontSize: '14px',
              color: '#777',
              marginBottom: '24px',
              marginTop: 0
            }}>
              A shared notebook. What crossed your mind this week?
            </p>

            {/* Input area */}
            <div style={{ marginBottom: '28px' }}>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={5000}
                placeholder="What's on your mind?"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  fontSize: '15px',
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontStyle: 'italic',
                  resize: 'vertical',
                  background: 'rgba(255, 254, 250, 0.9)',
                  color: '#2C2C2C',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                <button
                  onClick={handleSubmit}
                  disabled={!inputText.trim() || submitting}
                  style={{
                    padding: '8px 20px',
                    background: inputText.trim() ? '#2C2C2C' : '#ccc',
                    color: '#FFFEFA',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: inputText.trim() ? 'pointer' : 'default',
                    fontSize: '14px'
                  }}
                >
                  {submitting ? '...' : editingId ? 'Update' : 'Share'}
                </button>
                {editingId && (
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      padding: '8px 16px',
                      background: 'none',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#777'
                    }}
                  >
                    Cancel
                  </button>
                )}
                <span style={{ fontSize: '11px', color: '#999', marginLeft: 'auto' }}>
                  {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to submit
                </span>
              </div>
            </div>

            {/* Entries list — reverse chronological (newest first) */}
            {entries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '40px' }}>
                {entries.map((entry) => (
                  <ResponseEntry
                    key={entry.id}
                    entry={entry}
                    isOwn={entry.user_id === userId}
                    onEdit={handleEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                fontStyle: 'italic',
                color: '#999',
                fontSize: '14px'
              }}>
                The Commonplace Book is empty this week.
              </div>
            )}
          </div>
        </Motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
