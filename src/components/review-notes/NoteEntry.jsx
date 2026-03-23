import { useState, useRef, useEffect } from 'react'

/**
 * Single note or quote display for the review reader.
 * Owner sees ... overflow menu; friends see read-only.
 * Quotes get blockquote styling with curly quotation marks.
 */
export const NoteEntry = ({ note, isOwner, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div style={{ paddingBottom: '20px', position: 'relative' }}>
      {/* Overflow menu (owner only) */}
      {isOwner && (
        <div ref={menuRef} style={{ position: 'absolute', top: 0, right: 0, zIndex: 5 }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="cover-menu-btn"
          >
            &middot;&middot;&middot;
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#FFFEFA',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              borderRadius: '4px',
              overflow: 'hidden',
              zIndex: 10,
              minWidth: '80px'
            }}>
              <button
                onClick={() => { onEdit(note); setMenuOpen(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#2C2C2C',
                  textAlign: 'left'
                }}
              >
                Edit
              </button>
              <button
                onClick={() => { onDelete(note.id); setMenuOpen(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#C75D5D',
                  textAlign: 'left'
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {note.is_quote ? (
        <p style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: '15px',
          lineHeight: 1.8,
          fontStyle: 'italic',
          color: '#2C2C2C',
          margin: '0 0 4px',
          whiteSpace: 'pre-wrap'
        }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '24px', lineHeight: 0, color: '#D9CBAD', marginRight: '2px' }}>&ldquo;</span>
          {note.content}
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '24px', lineHeight: 0, color: '#D9CBAD', marginLeft: '2px' }}>&rdquo;</span>
          {note.page_ref && (
            <span style={{ fontSize: '13px', color: '#999', fontStyle: 'normal', marginLeft: '8px' }}>
              (p. {note.page_ref})
            </span>
          )}
        </p>
      ) : (
        <p style={{
          fontSize: '15px',
          lineHeight: 1.8,
          color: '#2C2C2C',
          margin: '0 0 4px',
          whiteSpace: 'pre-wrap'
        }}>
          {note.content}
        </p>
      )}

      {/* Page reference for non-quotes */}
      {!note.is_quote && note.page_ref && (
        <span style={{
          fontSize: '13px',
          color: '#999',
          display: 'inline-block'
        }}>
          (p. {note.page_ref})
        </span>
      )}
    </div>
  )
}
