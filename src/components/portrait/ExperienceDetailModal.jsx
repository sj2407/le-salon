import { useState, useEffect } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { EXPERIENCE_CATEGORIES } from './mockData'

/**
 * Experience detail — shows full info for a single experience.
 * Edit mode is controlled by the parent via `startInEdit` (set true when the
 * three-dot Edit menu in ExperiencesSection is used).
 */
export const ExperienceDetailModal = ({ isOpen, onClose, experience, onUpdated, startInEdit = false }) => {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [rating, setRating] = useState('')
  const [date, setDate] = useState('')
  const [city, setCity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync state with the experience and the requested initial mode
  useEffect(() => {
    if (!isOpen || !experience) {
      setEditing(false)
      return
    }
    setEditing(!!startInEdit)
    setName(experience.name || '')
    setCategory(experience.category || 'other')
    setRating(experience.rating == null ? '' : String(experience.rating))
    setDate(experience.date || '')
    setCity(experience.city || '')
    setNote(experience.note || '')
  }, [isOpen, experience, startInEdit])

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
      const { data, error } = await supabase
        .from('experiences')
        .update({
          name: name.trim(),
          category,
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
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
