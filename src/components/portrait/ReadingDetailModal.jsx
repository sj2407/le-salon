import { PortraitModal } from './PortraitModal'
import { ReadingGraph2D } from './ReadingGraph2D'

/**
 * Reading "See all" modal — 2D bipartite graph when graph data exists,
 * flat book list as fallback.
 */
export const ReadingDetailModal = ({ isOpen, onClose, books, readingThemes, readingGraph, onBookClick }) => {
  const hasGraph = readingGraph && readingGraph.themes?.length > 0 && readingGraph.edges?.length > 0

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title="Reading" maxWidth={hasGraph ? '520px' : '520px'}>
      {hasGraph ? (
        <ReadingGraph2D
          books={books}
          readingGraph={readingGraph}
        />
      ) : (
        <>
          {/* Theme tags */}
          {readingThemes && readingThemes.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '11px',
                color: '#999',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
              }}>
                Recurring themes
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {readingThemes.map((theme, i) => (
                  <span key={i} style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '14px',
                    background: '#E8DCC8',
                    fontSize: '13px',
                    color: '#2C2C2C',
                    fontStyle: 'italic',
                  }}>
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Book list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {books.map(book => (
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
                  {book.rating != null && (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#4A7BA7' }}>
                        {'★'.repeat(Math.round(book.rating / 2))}{'☆'.repeat(5 - Math.round(book.rating / 2))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {books.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontSize: '14px' }}>
                No books in this category yet
              </div>
            )}
          </div>
        </>
      )}
    </PortraitModal>
  )
}
