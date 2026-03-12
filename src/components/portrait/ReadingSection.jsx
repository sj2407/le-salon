import { useState, useRef } from 'react'
import { QuillMenu } from './QuillMenu'
import { ReadingGraphCompact } from './ReadingGraphCompact'

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
export const ReadingSection = ({ books, readingThemes, readingGraph, onBookClick, onThemeClick, onSeeAll, isOwner, onAddBook, onImportGoodreads, onScanBookshelf }) => {
  const [hoveredBook, setHoveredBook] = useState(null)
  const [hoveredChip, setHoveredChip] = useState(null) // { type: 'author'|'genre', value: string, rect: DOMRect }
  const scrollRef = useRef(null)

  const safeBooks = books || []

  // Empty state
  if (safeBooks.length === 0) {
    if (!isOwner) return null
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Reading</h3>
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
      </>
    )
  }

  // Currently reading book (first with status 'reading')
  const currentlyReading = safeBooks.find(b => b.status === 'reading')
  // Recent reads (exclude currently reading)
  const recentReads = safeBooks.filter(b => b.status !== 'reading')

  // Most read authors (count books per author, top 3)
  const authorCounts = {}
  safeBooks.forEach(b => {
    if (b.author) {
      const a = b.author.trim()
      authorCounts[a] = (authorCounts[a] || 0) + 1
    }
  })
  const topAuthors = Object.entries(authorCounts)
    .filter(([, count]) => count >= 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => ({ name, count, books: safeBooks.filter(b => b.author?.trim() === name).map(b => b.title) }))

  // Genre buckets — map messy Open Library subjects into bookstore-style labels
  // Each bucket has keywords: if any subject contains a keyword, the book counts for that genre
  const GENRE_BUCKETS = [
    { label: 'Mystery & Crime', keywords: ['police', 'detective', 'mystery', 'murder', 'crime', 'serial murder', 'private investigator', 'p.i.', 'meurtre'] },
    { label: 'Historical Fiction', keywords: ['fiction, historical', 'historical fiction', 'revolution, 1789'] },
    { label: 'War & Conflict', keywords: ['fiction, war', 'world war', 'vietnam war', 'soldiers', 'famine'] },
    { label: 'Psychological Fiction', keywords: ['fiction, psychological', 'psychological fiction', 'stream of consciousness'] },
    { label: 'Gothic & Horror', keywords: ['haunted houses', 'gothic revival', 'horror tales', 'horror stories', 'casas embrujadas', 'cuentos de terror'] },
    { label: 'Postcolonial', keywords: ['colonialism', 'imperialism', 'postcolonial', 'colonial question', 'apartheid'] },
    { label: 'Political Fiction', keywords: ['political corruption', 'dystopian fiction', 'totalitarianism', 'politicians'] },
    { label: 'Romance', keywords: ['fiction, romance', 'romance literature'] },
    { label: 'Business & Tech', keywords: ['business', 'economics', 'management', 'entrepreneurship', 'technology', 'startup', 'leadership', 'marketing'] },
    { label: 'Science', keywords: ['science', 'physics', 'biology', 'chemistry', 'mathematics', 'neuroscience', 'evolution'] },
    { label: 'Philosophy', keywords: ['philosophy', 'ethics', 'metaphysics', 'existentialism', 'stoicism'] },
    { label: 'Biography & Memoir', keywords: ['biography', 'memoir', 'autobiography', 'personal memoirs', 'personal narratives'] },
    { label: 'History', keywords: ['history', 'civilization', 'ancient', 'medieval', 'modern history'] },
    { label: 'Psychology', keywords: ['psychology', 'self-help', 'mental health', 'cognitive', 'behavioral'] },
    { label: 'Poetry', keywords: ['poetry', 'poems', 'verse', 'poesie'] },
  ]
  const genreBucketCounts = {}
  safeBooks.forEach(b => {
    const subjects = (b.goodreads_genres || b.google_books_genres || []).map(s => s.toLowerCase())
    if (subjects.length === 0) return
    const matched = new Set()
    for (const bucket of GENRE_BUCKETS) {
      if (matched.has(bucket.label)) continue
      for (const kw of bucket.keywords) {
        if (subjects.some(s => s.includes(kw))) {
          matched.add(bucket.label)
          genreBucketCounts[bucket.label] = (genreBucketCounts[bucket.label] || 0) + 1
          break
        }
      }
    }
    // Fallback: if book has genres but matched no specific bucket, count as "Fiction"
    if (matched.size === 0 && subjects.some(s => s.includes('fiction'))) {
      genreBucketCounts['Fiction'] = (genreBucketCounts['Fiction'] || 0) + 1
    }
  })
  // Build genre → book titles mapping for hover tooltips
  const genreBooks = {}
  safeBooks.forEach(b => {
    const subjects = (b.goodreads_genres || b.google_books_genres || []).map(s => s.toLowerCase())
    if (subjects.length === 0) return
    let matchedAny = false
    for (const bucket of GENRE_BUCKETS) {
      for (const kw of bucket.keywords) {
        if (subjects.some(s => s.includes(kw))) {
          if (!genreBooks[bucket.label]) genreBooks[bucket.label] = []
          if (!genreBooks[bucket.label].includes(b.title)) genreBooks[bucket.label].push(b.title)
          matchedAny = true
          break
        }
      }
    }
    // Fallback: if no specific bucket matched, file under "Fiction"
    if (!matchedAny && subjects.some(s => s.includes('fiction'))) {
      if (!genreBooks['Fiction']) genreBooks['Fiction'] = []
      if (!genreBooks['Fiction'].includes(b.title)) genreBooks['Fiction'].push(b.title)
    }
  })

  const topGenres = Object.entries(genreBucketCounts)
    .filter(([, count]) => count >= 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([genre, count]) => ({ genre, count, books: genreBooks[genre] || [] }))

  // Latest 5-star book (rating 10 = 5 stars in Goodreads scale)
  const latestFiveStar = safeBooks.find(b => b.rating != null && Number(b.rating) >= 10)

  return (
    <>
      {/* Quill edit button (owner only) */}
      {isOwner && (onAddBook || onImportGoodreads || onScanBookshelf) && (
        <QuillMenu items={[
          onScanBookshelf && { label: 'Scan your bookshelf', onClick: onScanBookshelf },
          onImportGoodreads && { label: 'Import from Goodreads', onClick: onImportGoodreads },
          onAddBook && { label: 'Add a book manually', onClick: onAddBook },
        ].filter(Boolean)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 className="handwritten" style={{ margin: 0, fontSize: '24px', color: '#2C2C2C' }}>Reading</h3>
        </div>
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

      {/* Hover tooltip for author/genre chips */}
      {hoveredChip && (
        <div style={{
          position: 'fixed',
          left: Math.min(hoveredChip.rect.left, window.innerWidth - 220),
          top: hoveredChip.rect.bottom + 6,
          background: '#FFFEFA',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          padding: '8px 12px',
          zIndex: 100,
          maxWidth: '200px',
          pointerEvents: 'none',
        }}>
          {hoveredChip.books.map((title, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#2C2C2C', lineHeight: 1.5, fontStyle: 'italic' }}>
              {title}
            </div>
          ))}
        </div>
      )}

      {/* Reading stats: top authors, genres, latest 5-star */}
      {(topAuthors.length > 0 || topGenres.length > 0 || latestFiveStar) && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Top authors */}
          {topAuthors.length > 0 && (
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                {topAuthors.some(a => a.count >= 2) ? 'Most read' : 'Authors'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {topAuthors.map(({ name, count, books: authorBooks }) => (
                  <span
                    key={name}
                    onMouseEnter={(e) => setHoveredChip({ type: 'author', books: authorBooks, rect: e.currentTarget.getBoundingClientRect() })}
                    onMouseLeave={() => setHoveredChip(null)}
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '14px',
                      background: '#F5F1EB',
                      fontSize: '12px',
                      color: '#2C2C2C',
                      cursor: 'default',
                    }}
                  >
                    {name}{count >= 2 && <span style={{ color: '#999' }}> ({count})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top genres */}
          {topGenres.length > 0 && (
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                {topGenres.some(g => g.count >= 2) ? 'Top genres' : 'Genres'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {topGenres.map(({ genre, count, books: genreBooksList }) => (
                  <span
                    key={genre}
                    onMouseEnter={(e) => setHoveredChip({ type: 'genre', books: genreBooksList, rect: e.currentTarget.getBoundingClientRect() })}
                    onMouseLeave={() => setHoveredChip(null)}
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '14px',
                      background: '#F5F1EB',
                      fontSize: '12px',
                      color: '#6B6156',
                      cursor: 'default',
                    }}
                  >
                    {genre}{count >= 2 && <span style={{ color: '#999' }}> ({count})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Latest 5-star */}
          {latestFiveStar && (
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Latest 5-star
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#2C2C2C', fontStyle: 'italic' }}>
                {latestFiveStar.title}{latestFiveStar.author ? ` — ${latestFiveStar.author}` : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Compact reading graph with label */}
      {readingGraph?.edges?.length > 0 && safeBooks.length >= 3 && (
        <div style={{ marginTop: '14px' }}>
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
          <ReadingGraphCompact
            books={safeBooks}
            readingGraph={readingGraph}
            onClick={onSeeAll}
          />
        </div>
      )}


    </>
  )
}
