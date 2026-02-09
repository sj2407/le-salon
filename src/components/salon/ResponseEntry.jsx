import { useState } from 'react'
import { getRelativeTime } from '../../lib/timeUtils'

/**
 * Shared entry display for Parlor responses and Commonplace Book entries.
 * Action buttons are absolutely positioned overlays.
 */
export const ResponseEntry = ({ entry, isOwn, onEdit, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const displayName = entry.profiles?.display_name || 'Anonymous'
  const initial = displayName.charAt(0).toUpperCase()
  const photoUrl = entry.profiles?.profile_photo_url

  return (
    <div
      style={{
        background: '#FFFEFA',
        borderRadius: '2px',
        padding: '14px 16px',
        boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.08)',
        position: 'relative'
      }}
    >
      {/* Header: avatar + name + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0
            }}
          />
        ) : (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#E8DCC8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Caveat', cursive",
              fontSize: '16px',
              fontWeight: 600,
              color: '#2C2C2C',
              flexShrink: 0
            }}
          >
            {initial}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{displayName}</span>
          <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
            {getRelativeTime(entry.created_at)}
            {entry.updated_at && entry.updated_at !== entry.created_at && ' (edited)'}
          </span>
        </div>

        {/* Own entry actions - absolutely positioned */}
        {isOwn && (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={() => onEdit(entry)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '13px',
                color: '#4A7BA7'
              }}
              title="Edit"
            >
              Edit
            </button>
            {confirmDelete ? (
              <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => { onDelete(entry.id); setConfirmDelete(false) }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontSize: '12px',
                    color: '#C75D5D',
                    fontWeight: 600
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontSize: '12px',
                    color: '#777'
                  }}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '13px',
                  color: '#C75D5D'
                }}
                title="Delete"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Entry text */}
      <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#2C2C2C' }}>
        {entry.text}
      </div>
    </div>
  )
}
