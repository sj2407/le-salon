import { useState } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { EXPERIENCE_CATEGORIES } from './mockData'

const SUBCATEGORIES = ['Play', 'Musical', 'Opera', 'Ballet', 'Stand-up', 'Concert', 'Exhibit']

/**
 * Add Experience modal — name, category, subcategory (theatre), artist_name (concert),
 * date, city, note. Fires Wikipedia enrichment after insert.
 */
export const AddExperienceModal = ({ isOpen, onClose, onCreated }) => {
  const { profile } = useAuth()
  const today = () => new Date().toISOString().slice(0, 10)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [subcategory, setSubcategory] = useState('')
  const [artistName, setArtistName] = useState('')
  const [rating, setRating] = useState(null)
  const [date, setDate] = useState(today)
  const [dateDirty, setDateDirty] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName('')
    setCategory('other')
    setSubcategory('')
    setArtistName('')
    setRating(null)
    setDate(today())
    setDateDirty(false)
    setNote('')
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    if (!profile?.id || !name.trim()) return
    setSaving(true)

    // Subcategory only meaningful for theatre, artist_name only for concert
    const subToPersist = category === 'theatre' && subcategory ? subcategory : null
    const artistToPersist = category === 'concert' && artistName.trim() ? artistName.trim() : null

    try {
      const { data, error } = await supabase
        .from('experiences')
        .insert({
          user_id: profile.id,
          name: name.trim(),
          category,
          subcategory: subToPersist,
          artist_name: artistToPersist,
          rating,
          date: date || null,
          note: note.trim() || null,
          source: 'manual',
        })
        .select()
        .single()

      if (error) throw error

      // Fire Wikipedia enrichment. enrichment_attempted_at is set in all exit paths.
      let updates = { enrichment_attempted_at: new Date().toISOString() }
      try {
        const { data: session } = await supabase.auth.getSession()
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/experience-enrich`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({
              name: name.trim(),
              category,
              subcategory: subToPersist,
              artist_name: artistToPersist,
            }),
          }
        )
        if (res.ok) {
          const result = await res.json()
          if (result.success) {
            if (result.description) updates.wikipedia_description = result.description
            if (result.wikipedia_url) updates.wikipedia_url = result.wikipedia_url
          }
        }
      } catch { /* swallow — at least mark attempted */ }

      // Persist enrichment + return updated row to caller
      const { data: enriched } = await supabase
        .from('experiences')
        .update(updates)
        .eq('id', data.id)
        .select()
        .single()

      onCreated(enriched || data)
      handleClose()
    } catch (err) {
      console.error('Error creating experience:', err)
      alert('Failed to save experience')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortraitModal isOpen={isOpen} onClose={handleClose} title="Add an experience" maxWidth="440px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Name */}
        <div>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
            What did you do? *
          </label>
          <input
            type="text"
            placeholder="Anselm Kiefer at Grand Palais"
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

        {/* Artist name — only when concert (Wikipedia search uses this for disambiguation) */}
        {category === 'concert' && (
          <div>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
              Artist
            </label>
            <input
              type="text"
              placeholder="Beyoncé"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
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

        {/* Date */}
        <div>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setDateDirty(true) }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              fontSize: '16px',
              background: '#FFFEFA',
              outline: 'none',
              boxSizing: 'border-box',
              color: dateDirty ? '#2C2C2C' : '#999',
            }}
          />
        </div>

        {/* Note */}
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

        {/* Save */}
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
      </div>
    </PortraitModal>
  )
}
