import { useState, useRef } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Bookshelf Scan modal — upload a photo of a bookshelf, OCR extracts titles.
 * User reviews detected books and adds them to their library.
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

  const reset = () => {
    setScanning(false)
    setDetectedBooks(null)
    setSelectedBooks({})
    setSaving(false)
    setError(null)
    setImagePreview(null)
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

      const { data: session } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bookshelf-scan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ image_base64: imageBase64 }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Scan failed')
      }

      if (data.books && data.books.length > 0) {
        setDetectedBooks(data.books)
        // Select all by default
        const selected = {}
        data.books.forEach((_, i) => { selected[i] = true })
        setSelectedBooks(selected)
      } else {
        setError(data.message || 'No books detected — try a better-lit photo.')
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

    try {
      const { data: session } = await supabase.auth.getSession()
      let added = 0

      for (const book of booksToAdd) {
        // Enrich each book
        let enrichment = {}
        try {
          const enrichRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-enrich`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.session.access_token}`,
              },
              body: JSON.stringify({ title: book.title, author: book.author || undefined }),
            }
          )
          if (enrichRes.ok) {
            const result = await enrichRes.json()
            if (result.success) {
              enrichment = {
                cover_url: result.cover_url,
                google_books_id: result.google_books_id,
                google_books_genres: result.genres,
                google_books_description: result.description,
              }
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

        if (!error) added++
      }

      if (onBooksAdded) onBooksAdded(added)
      handleClose()
    } catch (err) {
      console.error('Error adding scanned books:', err)
      setError('Failed to add some books')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = Object.values(selectedBooks).filter(Boolean).length

  return (
    <PortraitModal isOpen={isOpen} onClose={handleClose} title="Scan your bookshelf" maxWidth="480px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
              {detectedBooks.map((book, i) => (
                <label
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
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
                    style={{ accentColor: '#2C2C2C' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>{book.title}</div>
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
