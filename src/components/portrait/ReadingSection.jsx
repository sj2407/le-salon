import { useState, useRef } from 'react'

/**
 * Book cover placeholder — warm gold background with title text.
 * Used when cover_url is not available.
 */
const BookCoverPlaceholder = ({ title, size = 'small' }) => {
  const sizes = {
    small: { width: '60px', height: '85px', fontSize: '10px' },
    large: { width: '80px', height: '115px', fontSize: '11px' },
  }
  const s = sizes[size] || sizes.small

  return (
    <div style={{
      width: s.width,
      height: s.height,
      background: '#E8DCC8',
      borderRadius: '3px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6px',
      boxSizing: 'border-box',
    }}>
      <span style={{
        fontSize: s.fontSize,
        color: '#2C2C2C',
        textAlign: 'center',
        lineHeight: 1.3,
        fontStyle: 'italic',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
      }}>
        {title}
      </span>
    </div>
  )
}

/**
 * Reading section — currently reading, mini book covers, theme tags.
 */
export const ReadingSection = ({ books, readingThemes, onBookClick, onThemeClick, onSeeAll, isOwner, onAddBook, onImportGoodreads, onScanBookshelf }) => {
  const [hoveredBook, setHoveredBook] = useState(null)
  const scrollRef = useRef(null)

  const safeBooks = books || []

  // Empty state
  if (safeBooks.length === 0) {
    if (!isOwner) return null
    return (
      <div style={{
        background: '#FFFEFA',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '2px 3px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>{'\ud83d\udcd6'}</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2C' }}>Reading</h3>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
          Add books to shape your reading identity.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {onScanBookshelf && (
            <button
              onClick={onScanBookshelf}
              style={{
                padding: '10px 14px',
                background: '#F5F1EB',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#2C2C2C',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE6DA' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F1EB' }}
            >
              Scan your bookshelf
            </button>
          )}
          {onImportGoodreads && (
            <button
              onClick={onImportGoodreads}
              style={{
                padding: '10px 14px',
                background: '#F5F1EB',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#2C2C2C',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE6DA' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F1EB' }}
            >
              Import from Goodreads
            </button>
          )}
          {onAddBook && (
            <button
              onClick={onAddBook}
              style={{
                padding: '10px 14px',
                background: '#F5F1EB',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#2C2C2C',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE6DA' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F1EB' }}
            >
              Add a book manually
            </button>
          )}
        </div>
      </div>
    )
  }

  // Currently reading book (first with status 'reading')
  const currentlyReading = safeBooks.find(b => b.status === 'reading')
  // Recent reads (exclude currently reading)
  const recentReads = safeBooks.filter(b => b.status !== 'reading').slice(0, 8)

  return (
    <div style={{
      background: '#FFFEFA',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '2px 3px 8px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{'\ud83d\udcd6'}</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#2C2C2C' }}>Reading</h3>
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#4A7BA7',
              padding: 0,
            }}
          >
            See all
          </button>
        )}
      </div>

      {/* Currently reading */}
      {currentlyReading && (
        <div
          onClick={(e) => onBookClick && onBookClick(currentlyReading, e)}
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            marginBottom: '16px',
            cursor: onBookClick ? 'pointer' : 'default',
          }}
        >
          {currentlyReading.cover_url ? (
            <img
              src={currentlyReading.cover_url}
              alt={currentlyReading.title}
              style={{
                width: '80px',
                height: '115px',
                objectFit: 'cover',
                borderRadius: '3px',
                flexShrink: 0,
              }}
            />
          ) : (
            <BookCoverPlaceholder title={currentlyReading.title} size="large" />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Currently reading
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: '#2C2C2C', fontStyle: 'italic' }}>
              {currentlyReading.title}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              {currentlyReading.author}
            </p>
          </div>
        </div>
      )}

      {/* Mini book covers — horizontal scroll */}
      {recentReads.length > 0 && (
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="hide-scrollbar"
        >
          {recentReads.map((book, i) => (
            <div
              key={book.id}
              onClick={(e) => onBookClick && onBookClick(book, e)}
              onMouseEnter={() => setHoveredBook(i)}
              onMouseLeave={() => setHoveredBook(null)}
              style={{
                flexShrink: 0,
                cursor: onBookClick ? 'pointer' : 'default',
                transition: 'transform 0.15s',
                transform: hoveredBook === i ? 'translateY(-3px)' : 'translateY(0)',
              }}
            >
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  style={{
                    width: '60px',
                    height: '85px',
                    objectFit: 'cover',
                    borderRadius: '3px',
                    display: 'block',
                  }}
                />
              ) : (
                <BookCoverPlaceholder title={book.title} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Theme tags */}
      {readingThemes && readingThemes.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '14px',
        }}>
          {readingThemes.map((theme, i) => (
            <span
              key={i}
              onClick={() => onThemeClick && onThemeClick(theme)}
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '20px',
                background: '#E8DCC8',
                fontSize: '12px',
                color: '#2C2C2C',
                cursor: onThemeClick ? 'pointer' : 'default',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { if (onThemeClick) e.currentTarget.style.opacity = '0.75' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              {theme}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
