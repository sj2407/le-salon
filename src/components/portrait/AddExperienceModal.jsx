import { useState } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { EXPERIENCE_CATEGORIES } from './mockData'

/**
 * Add Experience modal — name, category, date, city, note.
 */
export const AddExperienceModal = ({ isOpen, onClose, onCreated }) => {
  const { profile } = useAuth()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [date, setDate] = useState('')
  const [city, setCity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName('')
    setCategory('other')
    setDate('')
    setCity('')
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

    try {
      const { data, error } = await supabase
        .from('experiences')
        .insert({
          user_id: profile.id,
          name: name.trim(),
          category,
          date: date || null,
          city: city.trim() || null,
          note: note.trim() || null,
          source: 'manual',
        })
        .select()
        .single()

      if (error) throw error

      onCreated(data)
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

        {/* Date + City row */}
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
              placeholder="Paris"
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
