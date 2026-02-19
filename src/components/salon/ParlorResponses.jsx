import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ResponseEntry } from './ResponseEntry'

/**
 * "Vos reflexions" — collapsible response section below the Parlor text.
 * Collapsed by default. Shows count when friends have responded.
 */
export const ParlorResponses = ({ responses, userId, onSubmit, onEdit, onDelete, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputText, setInputText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editingId])

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
    setIsExpanded(true)
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

  const count = responses.length

  return (
    <div style={{ maxWidth: '640px', margin: compact ? '0' : '40px auto 60px' }}>
      {/* Collapsible label */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: compact ? '4px 0' : '8px 0',
          fontFamily: "'Caveat', cursive",
          fontSize: compact ? '20px' : '24px',
          color: '#7A3B2E',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'transform 0.15s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        Vos r&eacute;flexions{count > 0 ? ` (${count})` : ''}
        <span style={{
          fontSize: '14px',
          transition: 'transform 0.2s ease',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block'
        }}>
          ▸
        </span>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{
              overflow: 'hidden',
              ...(compact ? { maxHeight: '40vh', overflowY: 'auto' } : {})
            }}
          >
            <div style={{ paddingTop: compact ? '8px' : '16px' }}>
              {/* Input area */}
              <div style={{ marginBottom: '20px' }}>
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={2000}
                  placeholder="Write your response..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    border: '1px solid #D4C9B8',
                    borderRadius: '3px',
                    fontSize: '15px',
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    fontStyle: 'italic',
                    resize: 'vertical',
                    background: '#FFFEFA',
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
                      background: inputText.trim() ? '#7A3B2E' : '#D4C9B8',
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
                        border: '1px solid #D4C9B8',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#A89F91'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Responses list — chronological (oldest first) */}
              {responses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {responses.map((response) => (
                    <ResponseEntry
                      key={response.id}
                      entry={response}
                      isOwn={response.user_id === userId}
                      onEdit={handleEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#8C8578', fontStyle: 'italic', fontSize: '14px' }}>
                  {/* Empty state: just the input is the invitation */}
                </div>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
