import { useState } from 'react'
import { NoteInput } from '../marginalia/NoteInput'
import { getRelativeTime } from '../../lib/timeUtils'

/**
 * Comment thread for a single review paragraph.
 * Two modes: friend view (leave/edit/delete comment) and owner view (see comments, reply).
 * Follows NoteScrap styling pattern.
 */
export const ParagraphComments = ({
  reviewId,
  paragraphIndex,
  comment,
  isOwner,
  ownerName,
  commenterName,
  onLeaveComment,
  onUpdateComment,
  onDeleteComment,
  onReplyToComment,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Friend view: leave or manage your comment
  if (!isOwner) {
    // No comment yet — show input
    if (!comment) {
      return (
        <div style={{ marginTop: '8px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '2px solid #D0D0D0' }}>
          <NoteInput
            onSubmit={(text) => onLeaveComment(reviewId, paragraphIndex, text)}
            onCancel={onClose}
            placeholder="A thought on this passage..."
            submitLabel="Comment"
            maxLength={280}
          />
        </div>
      )
    }

    // Editing existing comment
    if (isEditing) {
      return (
        <div style={{ marginTop: '8px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '2px solid #D0D0D0' }}>
          <NoteInput
            value={comment.content}
            onSubmit={(text) => {
              onUpdateComment(comment.id, text)
              setIsEditing(false)
            }}
            onCancel={() => setIsEditing(false)}
            placeholder="A thought on this passage..."
            submitLabel="Comment"
            isEditing
            maxLength={280}
          />
        </div>
      )
    }

    // Show existing comment
    return (
      <div style={{ marginTop: '8px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '2px solid #D0D0D0' }}>
        <p
          className="handwritten"
          style={{ fontSize: '18px', lineHeight: 1.5, margin: 0, marginBottom: '4px', color: '#2C2C2C' }}
        >
          {comment.content}
        </p>
        <div style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>— You, {getRelativeTime(comment.created_at)}</span>
          {comment.updated_at && comment.updated_at !== comment.created_at && (
            <span style={{ color: '#aaa' }}>(edited)</span>
          )}
          <button
            onClick={() => setIsEditing(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '12px', color: '#4A7BA7' }}
          >
            Edit
          </button>
          {confirmDelete ? (
            <span style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => { onDeleteComment(comment.id); setConfirmDelete(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '12px', color: '#C75D5D', fontWeight: 600 }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '12px', color: '#777' }}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '12px', color: '#C75D5D' }}
            >
              Delete
            </button>
          )}
        </div>

        {/* Owner's reply */}
        {comment.reply && (
          <div style={{ marginTop: '8px', marginLeft: '16px', paddingLeft: '12px', borderLeft: '2px solid #D0D0D0' }}>
            <p
              className="handwritten"
              style={{ fontSize: '17px', lineHeight: 1.5, margin: 0, marginBottom: '4px', color: '#4A4A4A', fontStyle: 'italic' }}
            >
              {comment.reply}
            </p>
            <div style={{ fontSize: '11px', color: '#999' }}>
              — {ownerName}, {getRelativeTime(comment.replied_at)}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Owner view: see friend's comment and reply
  if (!comment) return null

  return (
    <div style={{ marginTop: '8px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '2px solid #D0D0D0' }}>
      <p
        className="handwritten"
        style={{ fontSize: '18px', lineHeight: 1.5, margin: 0, marginBottom: '4px', color: '#2C2C2C' }}
      >
        {comment.content}
      </p>
      <div style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>— {commenterName || 'Friend'}, {getRelativeTime(comment.created_at)}</span>
        {!comment.reply && onReplyToComment && !isReplying && (
          <button
            onClick={() => setIsReplying(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '12px', color: '#4A7BA7' }}
          >
            Reply
          </button>
        )}
      </div>

      {/* Reply input */}
      {isReplying && !comment.reply && (
        <div style={{ marginTop: '8px', marginLeft: '16px' }}>
          <NoteInput
            onSubmit={(text) => {
              onReplyToComment(comment.id, text)
              setIsReplying(false)
            }}
            onCancel={() => setIsReplying(false)}
            placeholder="Your reply..."
            submitLabel="Reply"
            maxLength={280}
          />
        </div>
      )}

      {/* Existing reply */}
      {comment.reply && (
        <div style={{ marginTop: '8px', marginLeft: '16px', paddingLeft: '12px', borderLeft: '2px solid #D0D0D0' }}>
          <p
            className="handwritten"
            style={{ fontSize: '17px', lineHeight: 1.5, margin: 0, marginBottom: '4px', color: '#4A4A4A', fontStyle: 'italic' }}
          >
            {comment.reply}
          </p>
          <div style={{ fontSize: '11px', color: '#999' }}>
            — You, {getRelativeTime(comment.replied_at)}
          </div>
        </div>
      )}
    </div>
  )
}
