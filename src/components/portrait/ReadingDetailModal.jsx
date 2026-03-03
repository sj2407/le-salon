import { useState } from 'react'
import { PortraitModal } from './PortraitModal'

/**
 * Reading "See all" modal — full book list filterable by status.
 */
export const ReadingDetailModal = ({ isOpen, onClose, books, readingThemes, onBookClick }) => {
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredBooks = statusFilter === 'all'
    ? books
    : books.filter(b => b.status === statusFilter)

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'reading', label: 'Reading' },
    { value: 'read', label: 'Read' },
    { value: 'want_to_read', label: 'Want to read' },
  ]

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title="Reading" maxWidth="520px">
      {/* Theme tags */}
      {readingThemes && readingThemes.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {readingThemes.map((theme, i) => (
            <span key={i} style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '14px',
              background: '#E8DCC8',
              fontSize: '13px',
              color: '#2C2C2C',
            }}>
              {theme}
            </span>
          ))}
        </div>
      )}

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {statusOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            style={{
              padding: '5px 12px',
              borderRadius: '14px',
              border: 'none',
              background: statusFilter === opt.value ? '#2C2C2C' : '#F5F1EB',
              color: statusFilter === opt.value ? '#FFFEFA' : '#666',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Book list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredBooks.map(book => (
          <div
            key={book.id}
            onClick={() => onBookClick && onBookClick(book)}
            style={{
              display: 'flex',
              gap: '12px',
              cursor: onBookClick ? 'pointer' : 'default',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F1EB' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {/* Cover */}
            <div style={{
              width: '48px',
              height: '68px',
              borderRadius: '4px',
              overflow: 'hidden',
              flexShrink: 0,
              background: book.cover_url ? 'none' : '#E8DCC8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '10px', color: '#666', fontStyle: 'italic', padding: '4px', textAlign: 'center', lineHeight: 1.2 }}>
                  {book.title.slice(0, 30)}
                </span>
              )}
            </div>

            {/* Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#2C2C2C', lineHeight: 1.3 }}>
                {book.title}
              </div>
              {book.author && (
                <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                  {book.author}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                {book.rating != null && (
                  <span style={{ fontSize: '12px', color: '#4A7BA7' }}>
                    {'★'.repeat(Math.round(book.rating / 2))}{'☆'.repeat(5 - Math.round(book.rating / 2))}
                  </span>
                )}
                <span style={{
                  fontSize: '11px',
                  color: '#999',
                  background: '#F5F1EB',
                  padding: '1px 6px',
                  borderRadius: '8px',
                }}>
                  {book.status === 'reading' ? 'Reading' : book.status === 'read' ? 'Read' : 'Want to read'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredBooks.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontSize: '14px' }}>
            No books in this category yet
          </div>
        )}
      </div>
    </PortraitModal>
  )
}
