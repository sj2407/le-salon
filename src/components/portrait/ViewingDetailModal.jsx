import { useState, useEffect, useRef } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'

const TYPE_OPTIONS = [
  { value: 'tv', label: 'TV show' },
  { value: 'movie', label: 'Movie' },
]

const STATUS_OPTIONS = [
  { value: 'watched', label: 'Watched' },
  { value: 'watching', label: 'Watching' },
]

/**
 * Viewing detail — read view + edit mode for a single viewing row.
 * Auto-fires enrichment on open when description is missing and never attempted
 * (catches review-trigger-created rows).
 */
export const ViewingDetailModal = ({ isOpen, onClose, viewing, onUpdated, startInEdit = false, isOwner = false }) => {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('tv')
  const [status, setStatus] = useState('watched')
  const [rating, setRating] = useState('')
  const [dateWatched, setDateWatched] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  // Track which row we've already auto-enriched in this open cycle so we don't re-fire
  const autoEnrichedRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !viewing) {
      setEditing(false)
      autoEnrichedRef.current = null
      return
    }
    // Friend view is strictly read-only — never enter edit mode even if startInEdit is true
    setEditing(isOwner && !!startInEdit)
    setTitle(viewing.title || '')
    setType(viewing.type || 'tv')
    setStatus(viewing.status || 'watched')
    setRating(viewing.rating == null ? '' : String(viewing.rating))
    setDateWatched(viewing.date_watched || '')
    setNote(viewing.note || '')
  }, [isOpen, viewing, startInEdit, isOwner])

  // Auto-enrich on open: row has no overview AND enrichment was never attempted.
  // Owner only — friend view is strictly read-only and RLS would block writes anyway.
  useEffect(() => {
    if (!isOpen || !viewing || !isOwner) return
    if (autoEnrichedRef.current === viewing.id) return
    if (viewing.tmdb_overview) return
    if (viewing.enrichment_attempted_at) return
    autoEnrichedRef.current = viewing.id
    runEnrich(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, viewing?.id, isOwner])

  const runEnrich = async (force) => {
    if (!viewing) return
    setEnriching(true)
    try {
      // If forcing, clear enrichment_attempted_at first so the row re-attempts cleanly
      if (force) {
        await supabase
          .from('viewing')
          .update({ enrichment_attempted_at: null })
          .eq('id', viewing.id)
      }

      const { data: session } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/viewing-enrich`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ title: viewing.title, type: viewing.type }),
        }
      )

      const fields = {
        enrichment_attempted_at: new Date().toISOString(),
      }
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          fields.tmdb_id = result.tmdb_id
          fields.tmdb_overview = result.tmdb_overview
          fields.tmdb_release_year = result.tmdb_release_year
          fields.cover_url = result.cover_url
        }
      }

      const { data, error } = await supabase
        .from('viewing')
        .update(fields)
        .eq('id', viewing.id)
        .select()
        .single()

      if (!error && data) onUpdated?.(data)
    } catch (_err) {
      // Persist that we tried, even if the call failed
      try {
        await supabase
          .from('viewing')
          .update({ enrichment_attempted_at: new Date().toISOString() })
          .eq('id', viewing.id)
      } catch { /* swallow */ }
    } finally {
      setEnriching(false)
    }
  }

  if (!viewing) return null

  const typeLabel = viewing.type === 'tv' ? 'TV' : 'Film'
  const yearStr = viewing.tmdb_release_year ? ` · ${viewing.tmdb_release_year}` : ''

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    const parsedRating = rating === '' ? null : parseFloat(rating)
    const ratingValue = Number.isFinite(parsedRating) && parsedRating >= 0 && parsedRating <= 10
      ? parsedRating
      : null

    try {
      const { data, error } = await supabase
        .from('viewing')
        .update({
          title: title.trim(),
          type,
          status,
          rating: ratingValue,
          date_watched: dateWatched || null,
          note: note.trim() || null,
        })
        .eq('id', viewing.id)
        .select()
        .single()

      if (error) throw error
      onUpdated?.(data)
      onClose()
    } catch {
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const titleText = editing ? 'Edit' : viewing.title

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title={titleText} maxWidth="440px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!editing ? (
          <>
            {/* Cover + meta header */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              {viewing.cover_url ? (
                <img
                  src={viewing.cover_url}
                  alt={viewing.title}
                  style={{
                    width: '90px',
                    height: '135px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                />
              ) : null}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  borderRadius: '14px',
                  background: '#F5F1EB',
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '6px',
                }}>
                  {typeLabel}{yearStr}
                </div>
                {viewing.rating != null && (
                  <div className="handwritten" style={{ fontSize: '20px', color: '#2C2C2C' }}>
                    {viewing.rating}/10
                  </div>
                )}
                {viewing.date_watched && (
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                    Watched {new Date(viewing.date_watched).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>

            {/* Overview */}
            {viewing.tmdb_overview && (
              <div style={{
                padding: '14px 16px',
                background: '#F5F1EB',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#2C2C2C',
                lineHeight: 1.6,
                fontFamily: 'Source Serif 4, Georgia, serif',
              }}>
                {viewing.tmdb_overview}
              </div>
            )}

            {/* Note */}
            {viewing.note && (
              <div style={{
                padding: '12px 14px',
                background: '#FFFEFA',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#2C2C2C',
                lineHeight: 1.6,
                fontFamily: 'Source Serif 4, Georgia, serif',
                whiteSpace: 'pre-wrap',
              }}>
                {viewing.note}
              </div>
            )}

            {/* Re-enrich — owner only (friend view is read-only) */}
            {isOwner && (
              <button
                onClick={() => runEnrich(true)}
                disabled={enriching}
                style={{
                  alignSelf: 'flex-start',
                  padding: '6px 12px',
                  background: 'none',
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: '8px',
                  cursor: enriching ? 'default' : 'pointer',
                  fontSize: '13px',
                  color: '#666',
                }}
              >
                {enriching ? 'Re-enriching…' : 'Re-enrich from TMDB'}
              </button>
            )}
          </>
        ) : (
          <>
            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Title *
              </label>
              <input
                type="text"
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

            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                Type
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {TYPE_OPTIONS.map(opt => (
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

            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                Status
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(opt => (
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

            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Rating (0-10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="—"
                style={{
                  width: '100px',
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

            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Note (optional)
              </label>
              <textarea
                placeholder="What stood out?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'Source Serif 4, Georgia, serif',
                  lineHeight: 1.5,
                  background: '#FFFEFA',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div className="modal-sticky-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: '8px',
                  cursor: saving ? 'default' : 'pointer',
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
          </>
        )}
      </div>
    </PortraitModal>
  )
}
