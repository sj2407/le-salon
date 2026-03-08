import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { NoteEntry } from './NoteEntry'

/**
 * Notes & Quotes section rendered below the review body in the reader.
 * Owner can add/edit/delete notes; friends see read-only.
 */
export const ReviewNotesSection = ({
  notes,
  reviewId,
  isOwner,
  hasReviewText,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [content, setContent] = useState('')
  const [isQuote, setIsQuote] = useState(false)
  const [pageRef, setPageRef] = useState('')

  // Don't render empty section for friends
  if (!isOwner && notes.length === 0) return null

  const resetForm = () => {
    setContent('')
    setIsQuote(false)
    setPageRef('')
    setShowAddForm(false)
    setEditingNoteId(null)
  }

  const handleSave = async () => {
    if (!content.trim()) return
    if (editingNoteId) {
      await onEdit(editingNoteId, {
        content: content.trim(),
        is_quote: isQuote,
        page_ref: pageRef.trim() || null
      })
    } else {
      await onAdd(reviewId, {
        content: content.trim(),
        is_quote: isQuote,
        page_ref: pageRef.trim() || null
      })
    }
    resetForm()
  }

  const handleEditNote = (note) => {
    setContent(note.content)
    setIsQuote(note.is_quote)
    setPageRef(note.page_ref || '')
    setEditingNoteId(note.id)
    setShowAddForm(true)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      resetForm()
    }
  }

  return (
    <div style={{ padding: '0 24px 40px' }}>
      {/* Decorative divider (only if review text exists above) */}
      {hasReviewText && (
        <div className="reader-notes-divider" style={{ margin: '32px auto 24px' }} />
      )}

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3
          className="handwritten"
          style={{
            fontSize: '24px',
            color: '#622722',
            margin: 0,
            fontWeight: 400
          }}
        >
          Notes & Quotes
        </h3>
        {isOwner && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center'
            }}
            title="Add note or quote"
          >
            <Plus size={20} weight="duotone" color="#622722" />
          </button>
        )}
      </div>

      {/* Notes list */}
      {notes.map(note => (
        <NoteEntry
          key={note.id}
          note={note}
          isOwner={isOwner}
          onEdit={handleEditNote}
          onDelete={onDelete}
        />
      ))}

      {/* Add/Edit form (owner only) */}
      {isOwner && showAddForm && (
          <div style={{ marginTop: '12px' }} onKeyDown={handleKeyDown}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isQuote ? 'Enter the passage...' : 'Write a note...'}
              maxLength={2000}
              autoFocus
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '10px',
                fontSize: '14px',
                lineHeight: 1.6,
                fontFamily: isQuote ? "'Source Serif 4', Georgia, serif" : 'inherit',
                fontStyle: isQuote ? 'italic' : 'normal',
                border: '1px solid #D9CBAD',
                borderRadius: '4px',
                background: '#FFFEFA',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              {/* Quote toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isQuote}
                  onChange={(e) => setIsQuote(e.target.checked)}
                  style={{ accentColor: '#622722' }}
                />
                This is a quote
              </label>

              {/* Page reference */}
              <input
                type="text"
                value={pageRef}
                onChange={(e) => setPageRef(e.target.value)}
                placeholder="p. 42, Ch. 3..."
                maxLength={50}
                style={{
                  width: '100px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #D9CBAD',
                  borderRadius: '3px',
                  background: '#FFFEFA',
                  outline: 'none'
                }}
              />

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button
                  onClick={resetForm}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#777',
                    padding: '4px 8px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!content.trim()}
                  style={{
                    background: content.trim() ? '#622722' : '#CCC',
                    color: '#FFF',
                    border: 'none',
                    cursor: content.trim() ? 'pointer' : 'default',
                    fontSize: '13px',
                    padding: '4px 12px',
                    borderRadius: '3px'
                  }}
                >
                  {editingNoteId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  )
}
