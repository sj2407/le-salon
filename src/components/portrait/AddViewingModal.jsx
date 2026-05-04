import { useState } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Add Viewing modal — manual entry with title, type, status, rating.
 * Enriches via TMDB (viewing-enrich edge function) for cover + overview + year.
 * Mirrors AddBookModal.
 */
export const AddViewingModal = ({ isOpen, onClose, onCreated }) => {
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('tv')
  const [status, setStatus] = useState('watched')
  const [rating, setRating] = useState(null)
  const [dateWatched, setDateWatched] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle('')
    setType('tv')
    setStatus('watched')
    setRating(null)
    setDateWatched(new Date().toISOString().slice(0, 10))
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    if (!profile?.id || !title.trim()) return
    setSaving(true)

    // First: check user's reviews / discovery_items for an existing cover.
    // These already store TMDB cover URLs — no need for a roundtrip if we have one.
    let localCover = null
    try {
      const tag = type === 'tv' ? 'show' : 'movie'
      const t = title.trim().toLowerCase()
      const [{ data: rev }, { data: disc }] = await Promise.all([
        supabase.from('reviews').select('image_url, title')
          .eq('user_id', profile.id).eq('tag', tag).not('image_url', 'is', null).limit(50),
        supabase.from('discovery_items').select('image_url, title')
          .eq('user_id', profile.id).eq('tag', tag).not('image_url', 'is', null).limit(50),
      ])
      const hit = [...(rev || []), ...(disc || [])]
        .find(c => c.title && c.title.trim().toLowerCase() === t)
      localCover = hit?.image_url || null
    } catch { /* swallow */ }

    // Then: TMDB for overview + (cover if local missed). enrichment_attempted_at is set in all exit paths.
    let enrichment = {
      tmdb_id: null,
      tmdb_overview: null,
      tmdb_release_year: null,
      cover_url: localCover,
    }
    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/viewing-enrich`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ title: title.trim(), type }),
        }
      )
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          enrichment = {
            tmdb_id: result.tmdb_id,
            tmdb_overview: result.tmdb_overview,
            tmdb_release_year: result.tmdb_release_year,
            // Prefer TMDB cover if it returned one; otherwise keep local fallback.
            cover_url: result.cover_url || localCover,
          }
        }
      }
    } catch (_enrichErr) {
      // Continue with whatever local cover we found
    }

    try {
      const { data, error } = await supabase
        .from('viewing')
        .insert({
          user_id: profile.id,
          title: title.trim(),
          type,
          status,
          rating,
          date_watched: status === 'watched' ? (dateWatched || null) : null,
          source: 'manual',
          enrichment_attempted_at: new Date().toISOString(),
          ...enrichment,
        })
        .select()
        .single()

      if (error) {
        // Unique violation on (user_id, lower(title), type) — row likely created
        // by a concurrent review trigger. Surface a friendly message and let the
        // caller refetch.
        if (error.code === '23505') {
          alert('This title is already in your Watching section.')
          handleClose()
          onCreated?.(null)
          return
        }
        throw error
      }

      onCreated?.(data)
      handleClose()
    } catch (err) {
      console.error('Error adding viewing:', err)
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const typeOptions = [
    { value: 'tv', label: 'TV show' },
    { value: 'movie', label: 'Movie' },
  ]

  const statusOptions = [
    { value: 'watched', label: 'Watched' },
    { value: 'watching', label: 'Watching' },
  ]

  return (
    <PortraitModal isOpen={isOpen} onClose={handleClose} title="Add a TV show or movie" maxWidth="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Title */}
        <div>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
            Title *
          </label>
          <input
            type="text"
            placeholder="Severance"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              fontSize: '16px',
              background: '#FFFEFA',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Type */}
        <div>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
            Type
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {typeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  border: 'none',
                  background: type === opt.value ? '#2C2C2C' : '#F5F1EB',
                  color: type === opt.value ? '#FFFEFA' : '#666',
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

        {/* Status */}
        <div>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
            Status
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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

        {/* Rating (only for watched) */}
        {status === 'watched' && (
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

        {/* Date watched (only for watched) — drives which monthly portrait this counts for */}
        {status === 'watched' && (
          <div>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
              Date watched
            </label>
            <input
              type="date"
              value={dateWatched}
              onChange={(e) => setDateWatched(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '8px',
                fontSize: '16px',
                background: '#FFFEFA',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Save / Cancel */}
        <div className="modal-sticky-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
