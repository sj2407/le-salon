import { useState } from 'react'
import { NoteScrap } from './NoteScrap'
import { NoteInput } from './NoteInput'

export const CardBack = ({
  sectionName,
  notes = [],
  isOwner,
  currentUserId,
  onFlipBack,
  onMarkRead,
  onLeaveNote,
  onUpdateNote,
  onDeleteNote,
  onReplyToNote,
  ownerName,
  cardOwnerName
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [replyingToNoteId, setReplyingToNoteId] = useState(null)

  // For owner: show all notes from friends
  // For friend: show only their note (if any)
  const displayNotes = isOwner
    ? notes
    : notes.filter(n => n.from_user_id === currentUserId)

  const myNote = !isOwner && displayNotes.length > 0 ? displayNotes[0] : null

  const handleSubmitNote = async (content) => {
    if (myNote) {
      await onUpdateNote?.(myNote.id, content)
    } else {
      await onLeaveNote?.(sectionName, content)
    }
    setIsEditing(false)
    setEditingNote(null)
    onFlipBack?.()
  }

  const handleDeleteNote = async () => {
    if (myNote && window.confirm('Delete this note?')) {
      await onDeleteNote?.(myNote.id)
      onFlipBack?.()
    }
  }

  const handleMarkRead = async () => {
    const unreadNotes = notes.filter(n => !n.is_read)
    if (unreadNotes.length > 0) {
      await onMarkRead?.(sectionName)
    }
    onFlipBack?.()
  }

  const handleSubmitReply = async (replyText) => {
    if (replyingToNoteId) {
      await onReplyToNote?.(replyingToNoteId, replyText)
      setReplyingToNoteId(null)
    }
  }

  // Owner view: show notes from friends
  if (isOwner) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #E8E0D0'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Notes from friends
          </span>
        </div>

        {displayNotes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayNotes.map(note => (
              <div key={note.id}>
                <NoteScrap
                  note={note}
                  friendName={note.from_user?.display_name || 'A friend'}
                  timestamp={note.created_at}
                  replyAuthor={ownerName || 'You'}
                />

                {/* Reply button or inline input */}
                {!note.reply && replyingToNoteId !== note.id && (
                  <button
                    type="button"
                    onClick={() => setReplyingToNoteId(note.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '12px',
                      color: '#4A7BA7',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '2px 0',
                      marginLeft: '16px'
                    }}
                  >
                    Reply
                  </button>
                )}

                {replyingToNoteId === note.id && (
                  <div style={{ marginLeft: '16px', marginTop: '8px' }}>
                    <NoteInput
                      onSubmit={handleSubmitReply}
                      onCancel={() => setReplyingToNoteId(null)}
                      submitLabel="Reply"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            color: '#999',
            fontStyle: 'italic'
          }}>
            No notes yet for this section.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          {displayNotes.some(n => !n.is_read) ? (
            <button
              type="button"
              onClick={handleMarkRead}
              style={{
                padding: '8px 16px',
                background: '#7A3B2E',
                color: '#FFF',
                border: 'none',
                borderRadius: '3px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Mark as read
            </button>
          ) : (
            <button
              type="button"
              onClick={onFlipBack}
              style={{
                padding: '8px 20px',
                background: '#F5F1EB',
                border: '1px solid #CCC',
                borderRadius: '3px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#555'
              }}
            >
              Back
            </button>
          )}
        </div>
      </div>
    )
  }

  // Friend view: simple note input or display
  return (
    <div style={{ padding: '8px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {isEditing || editingNote ? (
        <NoteInput
          value={editingNote?.content || ''}
          onSubmit={handleSubmitNote}
          onCancel={() => {
            setIsEditing(false)
            setEditingNote(null)
          }}
          isEditing={!!editingNote}
        />
      ) : myNote ? (
        <>
          <NoteScrap
            note={myNote}
            friendName="You"
            timestamp={myNote.created_at}
            replyAuthor={cardOwnerName}
          />
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '12px',
            justifyContent: 'center'
          }}>
            <button
              type="button"
              onClick={() => setEditingNote(myNote)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                color: '#4A7BA7',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDeleteNote}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                color: '#E8534F',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onFlipBack}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                color: '#666',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Back
            </button>
          </div>
        </>
      ) : (
        <NoteInput
          onSubmit={handleSubmitNote}
          onCancel={onFlipBack}
        />
      )}
    </div>
  )
}
