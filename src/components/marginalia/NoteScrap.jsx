export const NoteScrap = ({ note, friendName, timestamp, replyAuthor }) => {
  const formatTime = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <p
        className="handwritten"
        style={{
          fontSize: '18px',
          lineHeight: 1.5,
          margin: 0,
          marginBottom: '4px',
          color: '#2C2C2C'
        }}
      >
        {note.content}
      </p>
      <div style={{ fontSize: '12px', color: '#888' }}>
        — {friendName}, {formatTime(timestamp || note.created_at)}
      </div>

      {/* Reply from card owner */}
      {note.reply && (
        <div style={{
          marginTop: '8px',
          marginLeft: '16px',
          paddingLeft: '12px',
          borderLeft: '2px solid #D0D0D0'
        }}>
          <p
            className="handwritten"
            style={{
              fontSize: '17px',
              lineHeight: 1.5,
              margin: 0,
              marginBottom: '4px',
              color: '#4A4A4A',
              fontStyle: 'italic'
            }}
          >
            {note.reply}
          </p>
          <div style={{ fontSize: '11px', color: '#999' }}>
            — {replyAuthor || 'Owner'}, {formatTime(note.replied_at)}
          </div>
        </div>
      )}
    </div>
  )
}
