import { useState, useEffect, useRef } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { EXPERIENCE_CATEGORIES } from './mockData'

const SUBCATEGORIES = ['Play', 'Musical', 'Opera', 'Ballet', 'Stand-up', 'Concert', 'Exhibit']

/**
 * Experience detail — shows full info for a single experience.
 * Edit mode is controlled by the parent via `startInEdit`. isOwner gates all
 * write actions (auto-enrich on open, Re-enrich button, edit-mode entry).
 */
export const ExperienceDetailModal = ({ isOpen, onClose, experience, onUpdated, startInEdit = false, isOwner = false }) => {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [subcategory, setSubcategory] = useState('')
  const [artistName, setArtistName] = useState('')
  const [rating, setRating] = useState('')
  const [date, setDate] = useState('')
  const [city, setCity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const autoEnrichedRef = useRef(null)

  // Sync state with the experience and the requested initial mode
  useEffect(() => {
    if (!isOpen || !experience) {
      setEditing(false)
      autoEnrichedRef.current = null
      return
    }
    // Friend view is strictly read-only — never enter edit mode
    setEditing(isOwner && !!startInEdit)
    setName(experience.name || '')
    setCategory(experience.category || 'other')
    setSubcategory(experience.subcategory || '')
    setArtistName(experience.artist_name || '')
    setRating(experience.rating == null ? '' : String(experience.rating))
    setDate(experience.date || '')
    setCity(experience.city || '')
    setNote(experience.note || '')
  }, [isOpen, experience, startInEdit, isOwner])

  // Auto-enrich on open: row has no description AND enrichment was never attempted.
  // Owner only — friend view is read-only and RLS would block the write anyway.
  useEffect(() => {
    if (!isOpen || !experience || !isOwner) return
    if (autoEnrichedRef.current === experience.id) return
    if (experience.wikipedia_description) return
    if (experience.enrichment_attempted_at) return
    autoEnrichedRef.current = experience.id
    runEnrich(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, experience?.id, isOwner])

  const runEnrich = async (force) => {
    if (!experience) return
    setEnriching(true)
    try {
      if (force) {
        await supabase
          .from('experiences')
          .update({ enrichment_attempted_at: null })
          .eq('id', experience.id)
      }
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/experience-enrich`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session.access_token}` },
          body: JSON.stringify({
            name: experience.name,
            category: experience.category,
            subcategory: experience.subcategory,
            artist_name: experience.artist_name,
          }),
        }
      )
      const fields = { enrichment_attempted_at: new Date().toISOString() }
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          if (result.description) fields.wikipedia_description = result.description
          if (result.wikipedia_url) fields.wikipedia_url = result.wikipedia_url
        }
      }
      const { data: updated } = await supabase
        .from('experiences')
        .update(fields)
        .eq('id', experience.id)
        .select()
        .single()
      if (updated) onUpdated?.(updated)
    } catch {
      try {
        await supabase
          .from('experiences')
          .update({ enrichment_attempted_at: new Date().toISOString() })
          .eq('id', experience.id)
      } catch { /* swallow */ }
    } finally {
      setEnriching(false)
    }
  }

  if (!experience) return null

  const categoryMeta = EXPERIENCE_CATEGORIES.find(c => c.value === experience.category)
  const icon = categoryMeta?.icon || '✨'
  const categoryLabel = categoryMeta?.label || experience.category

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const handleCancel = () => {
    onClose()
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    const parsedRating = rating === '' ? null : parseFloat(rating)
    const ratingValue = Number.isFinite(parsedRating) && parsedRating >= 0 && parsedRating <= 10
      ? parsedRating
      : null

    try {
      const subToPersist = category === 'theatre' && subcategory ? subcategory : null
      const artistToPersist = category === 'concert' && artistName.trim() ? artistName.trim() : null

      const { data, error } = await supabase
        .from('experiences')
        .update({
          name: name.trim(),
          category,
          subcategory: subToPersist,
          artist_name: artistToPersist,
          rating: ratingValue,
          date: date || null,
          city: city.trim() || null,
          note: note.trim() || null,
        })
        .eq('id', experience.id)
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

  const titleText = editing ? `Edit experience` : `${icon} ${experience.name}`

  return (
    <PortraitModal isOpen={isOpen} onClose={onClose} title={titleText} maxWidth="440px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!editing ? (
          <>
            {/* Category */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '14px',
              background: '#F5F1EB',
              fontSize: '13px',
              color: '#666',
              alignSelf: 'flex-start',
            }}>
              {icon} {categoryLabel}
            </div>

            {/* Rating */}
            {experience.rating != null && (
              <div className="handwritten" style={{ fontSize: '20px', color: '#2C2C2C' }}>
                {experience.rating}/10
              </div>
            )}

            {/* Date & City */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {experience.date && (
                <div style={{ fontSize: '14px', color: '#2C2C2C' }}>
                  {formatDate(experience.date)}
                </div>
              )}
              {experience.city && (
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {experience.city}
                </div>
              )}
            </div>

            {/* Subcategory + Artist row */}
            {(experience.subcategory || experience.artist_name) && (
              <div style={{ fontSize: '13px', color: '#666' }}>
                {experience.subcategory && <span>{experience.subcategory}</span>}
                {experience.subcategory && experience.artist_name && <span> · </span>}
                {experience.artist_name && <span>{experience.artist_name}</span>}
              </div>
            )}

            {/* Wikipedia description */}
            {experience.wikipedia_description && (
              <div style={{
                marginTop: '8px',
                padding: '14px 16px',
                background: '#F5F1EB',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#2C2C2C',
                lineHeight: 1.6,
                fontFamily: 'Source Serif 4, Georgia, serif',
              }}>
                {experience.wikipedia_description}
                {experience.wikipedia_url && (
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    <a
                      href={experience.wikipedia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#4A7BA7', textDecoration: 'underline' }}
                    >
                      Read on Wikipedia →
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            {experience.note && (
              <div style={{
                marginTop: '8px',
                padding: '14px 16px',
                background: '#F5F1EB',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#2C2C2C',
                lineHeight: 1.6,
                fontFamily: 'Source Serif 4, Georgia, serif',
                whiteSpace: 'pre-wrap',
              }}>
                {experience.note}
              </div>
            )}

            {/* Re-enrich — owner only */}
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
                {enriching ? 'Re-enriching…' : 'Re-enrich from Wikipedia'}
              </button>
            )}
          </>
        ) : (
          <>
            {/* Name */}
            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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

            {/* Category */}
            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                Category
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {EXPERIENCE_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '14px',
                      border: 'none',
                      background: category === cat.value ? '#2C2C2C' : '#F5F1EB',
                      color: category === cat.value ? '#FFFEFA' : '#666',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategory — only when theatre */}
            {category === 'theatre' && (
              <div>
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
                  Type
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {SUBCATEGORIES.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSubcategory(subcategory === opt ? '' : opt)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '14px',
                        border: 'none',
                        background: subcategory === opt ? '#2C2C2C' : '#F5F1EB',
                        color: subcategory === opt ? '#FFFEFA' : '#666',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Artist — only when concert */}
            {category === 'concert' && (
              <div>
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Artist
                </label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Beyoncé"
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

            {/* Rating */}
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

            {/* Date + City */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
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
            </div>

            {/* Note */}
            <div>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Note
              </label>
              <textarea
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

            {/* Save / Cancel */}
            <div className="modal-sticky-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={handleCancel}
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
                disabled={!name.trim() || saving}
                style={{
                  padding: '8px 20px',
                  background: name.trim() && !saving ? '#2C2C2C' : '#ccc',
                  color: '#FFFEFA',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: name.trim() && !saving ? 'pointer' : 'default',
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
