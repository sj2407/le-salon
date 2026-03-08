import { useState, useRef } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Interactive star rating — 5 stars, maps to 0-10 scale (2,4,6,8,10).
 */
const StarRating = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0)
  const stars = [1, 2, 3, 4, 5]

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {stars.map(star => {
        const filled = hovered ? star <= hovered : star <= value
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star === value ? 0 : star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '0 1px',
              color: filled ? '#D4A84B' : '#DDD',
              transition: 'color 0.1s',
              lineHeight: 1,
            }}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            {'\u2605'}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Bookshelf Scan modal — upload a photo of a bookshelf, OCR extracts titles.
 * User reviews detected books, adds them, then rates them before closing.
 */
export const BookshelfScanModal = ({ isOpen, onClose, onBooksAdded }) => {
  const { profile } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [detectedBooks, setDetectedBooks] = useState(null)
  const [selectedBooks, setSelectedBooks] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileRef = useRef(null)

  // Rating step
  const [step, setStep] = useState('upload') // 'upload' | 'rate'
  const [addedBooks, setAddedBooks] = useState([]) // books with IDs from DB
  const [ratings, setRatings] = useState({}) // { [bookId]: starCount 1-5 }
  const [savingRatings, setSavingRatings] = useState(false)

  const reset = () => {
    setScanning(false)
    setDetectedBooks(null)
    setSelectedBooks({})
    setSaving(false)
    setError(null)
    setImagePreview(null)
    setStep('upload')
    setAddedBooks([])
    setRatings({})
    setSavingRatings(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }

    setError(null)
    setDetectedBooks(null)
    setImagePreview(URL.createObjectURL(file))
    setScanning(true)

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const imageBase64 = btoa(binary)

      const { data, error: invokeError } = await supabase.functions.invoke('bookshelf-scan', {
        body: { image_base64: imageBase64 },
      })

      if (invokeError) {
        let msg = 'Scan failed'
        try {
          if (invokeError.context) {
            const body = await invokeError.context.json()
            msg = body?.error || invokeError.message || msg
          } else {
            msg = invokeError.message || msg
          }
        } catch (_) { /* use default */ }
        throw new Error(msg)
      }

      if (data?.books && data.books.length > 0) {
        setDetectedBooks(data.books)
        const selected = {}
        data.books.forEach((_, i) => { selected[i] = true })
        setSelectedBooks(selected)
      } else {
        setError(data?.message || 'No books detected \u2014 try a better-lit photo.')
      }
    } catch (err) {
      console.error('Bookshelf scan error:', err)
      setError(err.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const toggleBook = (index) => {
    setSelectedBooks(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const handleAddSelected = async () => {
    if (!profile?.id) return

    const booksToAdd = detectedBooks.filter((_, i) => selectedBooks[i])
    if (booksToAdd.length === 0) return

    setSaving(true)
    setError(null)

    try {
      const addedTitles = []

      for (const book of booksToAdd) {
        // Enrich each book
        let enrichment = {}
        try {
          const { data: result, error: enrichError } = await supabase.functions.invoke('book-enrich', {
            body: { title: book.title, author: book.author || undefined },
          })
          if (!enrichError && result?.success) {
            enrichment = {
              cover_url: result.cover_url,
              google_books_id: result.google_books_id,
              google_books_genres: result.genres,
              google_books_description: result.description,
            }
          }
        } catch (_) {
          // Continue without enrichment
        }

        const { error } = await supabase
          .from('books')
          .upsert({
            user_id: profile.id,
            title: book.title,
            author: book.author || null,
            status: 'read',
            source: 'bookshelf_import',
            ...enrichment,
          }, { ignoreDuplicates: true })

        if (!error) addedTitles.push(book.title)
      }

      if (addedTitles.length === 0) {
        setError('No new books were added (they may already be in your library)')
        return
      }

      // Fetch the added books from DB to get IDs for rating
      const { data: dbBooks } = await supabase
        .from('books')
        .select('id, title, author, cover_url, rating')
        .eq('user_id', profile.id)
        .in('title', addedTitles)
        .order('created_at', { ascending: false })

      if (dbBooks && dbBooks.length > 0) {
        setAddedBooks(dbBooks)
        // Pre-fill any existing ratings
        const existingRatings = {}
        dbBooks.forEach(b => {
          if (b.rating != null) existingRatings[b.id] = Math.round(b.rating / 2)
        })
        setRatings(existingRatings)
        setStep('rate')
      } else {
        // Couldn't fetch books — just close
        if (onBooksAdded) onBooksAdded(addedTitles.length)
        handleClose()
      }
    } catch (err) {
      console.error('Error adding scanned books:', err)
      setError('Failed to add some books')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRatings = async () => {
    setSavingRatings(true)
    setError(null)

    try {
      // Save each rating (star 1-5 → 0-10 scale: star * 2)
      for (const [bookId, stars] of Object.entries(ratings)) {
        if (stars > 0) {
          await supabase
            .from('books')
            .update({ rating: stars * 2 })
            .eq('id', bookId)
            .eq('user_id', profile.id)
        }
      }

      if (onBooksAdded) onBooksAdded(addedBooks.length)
      handleClose()
    } catch (err) {
      console.error('Error saving ratings:', err)
      setError('Failed to save some ratings')
    } finally {
      setSavingRatings(false)
    }
  }

  const handleSkipRatings = () => {
    if (onBooksAdded) onBooksAdded(addedBooks.length)
    handleClose()
  }

  const selectedCount = Object.values(selectedBooks).filter(Boolean).length
  const ratedCount = Object.values(ratings).filter(v => v > 0).length

  return (
    <PortraitModal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'rate' ? 'Rate your books' : 'Scan your bookshelf'}
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ─── STEP 1: Upload & Select ─── */}
        {step === 'upload' && (
          <>
            {/* Upload prompt */}
            {!detectedBooks && !scanning && (
              <>
                <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
                  Take a photo of your bookshelf. We'll detect the titles and add them to your library.
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: '20px',
                    background: '#FFFEFA',
                    border: '2px dashed rgba(0,0,0,0.15)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#666',
                  }}
                >
                  Take or choose a photo
                </button>
              </>
            )}

            {/* Scanning */}
            {scanning && (
              <div style={{ textAlign: 'center' }}>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Bookshelf"
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      opacity: 0.7,
                    }}
                  />
                )}
                <p style={{ margin: 0, fontSize: '14px', color: '#999', fontStyle: 'italic' }}>
                  Reading spines... this takes a few seconds
                </p>
              </div>
            )}

            {/* Detected books */}
            {detectedBooks && (
              <>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  Found <strong>{detectedBooks.length}</strong> books. Uncheck any you don't want to add.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
                  {detectedBooks.map((book, i) => (
                    <label
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        background: selectedBooks[i] ? '#F5F1EB' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedBooks[i]}
                        onChange={() => toggleBook(i)}
                        style={{ accentColor: '#2C2C2C', width: '16px', height: '16px', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', color: '#2C2C2C', fontWeight: 500, lineHeight: 1.3 }}>{book.title}</div>
                        {book.author && (
                          <div style={{ fontSize: '12px', color: '#999' }}>{book.author}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#999' }}>
                    {selectedCount} selected
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleClose}
                      style={{
                        padding: '8px 16px',
                        background: 'none',
                        border: '1px solid rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#666',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSelected}
                      disabled={selectedCount === 0 || saving}
                      style={{
                        padding: '8px 20px',
                        background: selectedCount > 0 && !saving ? '#2C2C2C' : '#ccc',
                        color: '#FFFEFA',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: selectedCount > 0 && !saving ? 'pointer' : 'default',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      {saving ? 'Adding...' : `Add ${selectedCount} books`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ─── STEP 2: Rate ─── */}
        {step === 'rate' && (
          <>
            <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
              Rate the books you've read. This helps build your reading profile and themes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {addedBooks.map(book => (
                <div
                  key={book.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#F5F1EB',
                  }}
                >
                  {/* Mini cover or placeholder */}
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      style={{ width: '36px', height: '52px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: '36px',
                      height: '52px',
                      background: '#E8DCC8',
                      borderRadius: '3px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '9px', color: '#2C2C2C', textAlign: 'center', fontStyle: 'italic', padding: '2px', lineHeight: 1.2 }}>
                        {book.title.slice(0, 20)}
                      </span>
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: '#2C2C2C', fontWeight: 500, lineHeight: 1.3 }}>
                      {book.title}
                    </div>
                    {book.author && (
                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>{book.author}</div>
                    )}
                    <StarRating
                      value={ratings[book.id] || 0}
                      onChange={(stars) => setRatings(prev => ({ ...prev, [book.id]: stars }))}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <button
                onClick={handleSkipRatings}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#999',
                  padding: 0,
                }}
              >
                Skip for now
              </button>
              <button
                onClick={handleSaveRatings}
                disabled={savingRatings}
                style={{
                  padding: '8px 20px',
                  background: !savingRatings ? '#2C2C2C' : '#ccc',
                  color: '#FFFEFA',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: !savingRatings ? 'pointer' : 'default',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {savingRatings ? 'Saving...' : ratedCount > 0 ? `Save ${ratedCount} ratings` : 'Done'}
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '14px 16px',
            background: '#FDF0F0',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#C75D5D',
          }}>
            {error}
          </div>
        )}
      </div>
    </PortraitModal>
  )
}
