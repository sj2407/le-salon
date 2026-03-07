import { useState } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Add Book modal — manual entry with title, author, status, rating.
 * Enriches via Google Books Edge Function for cover + genres.
 */
export const AddBookModal = ({ isOpen, onClose, onCreated }) => {
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState('read')
  const [rating, setRating] = useState(null)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle('')
    setAuthor('')
    setStatus('read')
    setRating(null)
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    if (!profile?.id || !title.trim()) return
    setSaving(true)

    try {
      // Enrich via Edge Function
      let enrichment = {}
      try {
        const { data: session } = await supabase.auth.getSession()
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-enrich`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({ title: title.trim(), author: author.trim() || undefined }),
          }
        )
        if (res.ok) {
          const result = await res.json()
          if (result.success) {
            enrichment = {
              cover_url: result.cover_url,
              google_books_id: result.google_books_id,
              google_books_genres: result.genres,
              google_books_description: result.description,
            }
          }
        }
      } catch (_enrichErr) {
        // Continue without enrichment
      }

      const { data, error } = await supabase
        .from('books')
        .insert({
          user_id: profile.id,
          title: title.trim(),
          author: author.trim() || null,
          status,
          rating,
          source: 'manual',
          ...enrichment,
        })
        .select()
        .single()

      if (error) throw error

      onCreated(data)
      handleClose()
    } catch (err) {
      console.error('Error adding book:', err)
      alert('Failed to save book')
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = [
    { value: 'reading', label: 'Reading' },
    { value: 'read', label: 'Read' },
    { value: 'want_to_read', label: 'Want to read' },
  ]

  return (
    <PortraitModal isOpen={isOpen} onClose={handleClose} title="Add a book" maxWidth="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Title */}
        <div>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
            Title *
          </label>
          <input
            type="text"
            placeholder="The Stranger"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#FFFEFA',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Author */}
        <div>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
            Author
          </label>
          <input
            type="text"
            placeholder="Albert Camus"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#FFFEFA',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Status */}
        <div>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
            Status
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  border: 'none',
                  background: status === opt.value ? '#2C2C2C' : '#F5F1EB',
                  color: status === opt.value ? '#FFFEFA' : '#666',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rating (only for read books) */}
        {status === 'read' && (
          <div>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
              Rating
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[2, 4, 6, 8, 10].map(val => (
                <button
                  key={val}
                  onClick={() => setRating(rating === val ? null : val)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '22px',
                    padding: '2px',
                    color: rating != null && val <= rating ? '#4A7BA7' : '#ddd',
                    transition: 'color 0.1s',
                  }}
                >
                  ★
                </button>
              ))}
              {rating != null && (
                <span style={{ fontSize: '12px', color: '#999', alignSelf: 'center', marginLeft: '6px' }}>
                  {rating}/10
                </span>
              )}
            </div>
          </div>
        )}

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
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
            onClick={handleSave}
            disabled={!title.trim() || saving}
            style={{
              padding: '8px 20px',
              background: title.trim() && !saving ? '#2C2C2C' : '#ccc',
              color: '#FFFEFA',
              border: 'none',
              borderRadius: '8px',
              cursor: title.trim() && !saving ? 'pointer' : 'default',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </PortraitModal>
  )
}
