import { useState, useRef } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useNativeCamera } from '../../hooks/useNativeCamera'
import { EXPERIENCE_CATEGORIES } from './mockData'

const getCategoryIcon = (category) => {
  const found = EXPERIENCE_CATEGORIES.find(c => c.value === category)
  return found ? found.icon : '\u2728'
}

/**
 * Playbill Scan modal — upload a photo of a playbill/ticket, AI extracts events.
 * User reviews detected experiences and adds them to their library.
 */
export const PlaybillScanModal = ({ isOpen, onClose, onExperiencesAdded }) => {
  const { profile } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [detectedExperiences, setDetectedExperiences] = useState(null)
  const [selectedItems, setSelectedItems] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const imageFileRef = useRef(null) // store the raw File for upload
  const { pickImage } = useNativeCamera()

  const reset = () => {
    setScanning(false)
    setDetectedExperiences(null)
    setSelectedItems({})
    setSaving(false)
    setError(null)
    setImagePreview(null)
    imageFileRef.current = null
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleCapture = async () => {
    const result = await pickImage({ camera: true })
    if (!result) return

    setError(null)
    setDetectedExperiences(null)
    setImagePreview(result.previewUrl)
    imageFileRef.current = result.blob
    setScanning(true)

    try {
      const imageBase64 = result.base64

      const { data, error: invokeError } = await supabase.functions.invoke('vision-scan', {
        body: { image_base64: imageBase64, mode: 'playbill' },
      })

      if (invokeError) {
        let msg = invokeError.message
        try { const ctx = await invokeError.context?.json(); if (ctx?.error) msg = ctx.error } catch {}
        throw new Error(msg || 'Scan failed')
      }

      if (data.experiences && data.experiences.length > 0) {
        setDetectedExperiences(data.experiences)
        // Select all by default
        const selected = {}
        data.experiences.forEach((_, i) => { selected[i] = true })
        setSelectedItems(selected)
      } else {
        setError(data.message || 'No events detected — try a clearer photo.')
      }
    } catch (err) {
      console.error('Playbill scan error:', err)
      setError(err.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const toggleItem = (index) => {
    setSelectedItems(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const handleAddSelected = async () => {
    if (!profile?.id) return

    const toAdd = detectedExperiences.filter((_, i) => selectedItems[i])
    if (toAdd.length === 0) return

    setSaving(true)

    try {
      // Upload playbill image to storage
      let imageUrl = null
      if (imageFileRef.current) {
        const ext = imageFileRef.current.name.split('.').pop() || 'jpg'
        const path = `playbills/${profile.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('covers')
          .upload(path, imageFileRef.current, { upsert: true })
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
          imageUrl = publicUrl
        }
      }

      const rows = toAdd.map(exp => ({
        user_id: profile.id,
        name: exp.name,
        category: exp.category || 'other',
        date: exp.date || null,
        city: exp.city || null,
        source: 'playbill_scan',
        image_url: imageUrl,
      }))

      const { error } = await supabase.from('experiences').insert(rows)
      if (error) throw error

      if (onExperiencesAdded) onExperiencesAdded(toAdd.length)
      handleClose()
    } catch (err) {
      console.error('Error adding scanned experiences:', err)
      setError('Failed to add some experiences')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = Object.values(selectedItems).filter(Boolean).length

  return (
    <PortraitModal isOpen={isOpen} onClose={handleClose} title="Scan a playbill" maxWidth="480px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Upload prompt */}
        {!detectedExperiences && !scanning && (
          <>
            <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
              Take a photo of a playbill, event ticket, or concert poster. We'll extract the event details.
            </p>

            <button
              onClick={handleCapture}
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
                alt="Playbill"
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
              Reading playbill... this takes a few seconds
            </p>
          </div>
        )}

        {/* Detected experiences */}
        {detectedExperiences && (
          <>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
              Found <strong>{detectedExperiences.length}</strong> event{detectedExperiences.length !== 1 ? 's' : ''}. Uncheck any you don't want to add.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
              {detectedExperiences.map((exp, i) => (
                <label
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: selectedItems[i] ? '#F5F1EB' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedItems[i]}
                    onChange={() => toggleItem(i)}
                    style={{ accentColor: '#2C2C2C', width: '16px', height: '16px', flexShrink: 0 }}
                  />
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt=""
                      style={{
                        width: '36px',
                        height: '52px',
                        objectFit: 'cover',
                        borderRadius: '3px',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1 }}>
                      {getCategoryIcon(exp.category)}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: '#2C2C2C', fontWeight: 500, lineHeight: 1.3 }}>{exp.name}</div>
                    {(exp.city || exp.date) && (
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {[exp.city, exp.date].filter(Boolean).join(' \u00b7 ')}
                      </div>
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
                  {saving ? 'Adding...' : `Add ${selectedCount} experience${selectedCount !== 1 ? 's' : ''}`}
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
