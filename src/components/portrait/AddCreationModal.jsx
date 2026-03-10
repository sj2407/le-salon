import { useState, useRef, useEffect } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Add Creation modal — write text or upload an image.
 * Optional title (max 80 chars), visibility toggle (default visible).
 */
export const AddCreationModal = ({ isOpen, onClose, onCreated, onUpdated, initialMode = null, editCreation = null }) => {
  const { profile } = useAuth()
  const [mode, setMode] = useState(null) // null | 'text' | 'image'
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isVisible, setIsVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const isEditing = !!editCreation

  // Sync initialMode or editCreation when modal opens
  useEffect(() => {
    if (!isOpen) return
    if (editCreation) {
      setMode(editCreation.type)
      setTitle(editCreation.title || '')
      setTextContent(editCreation.text_content || '')
      setIsVisible(editCreation.is_visible ?? true)
      if (editCreation.type === 'image' && editCreation.image_url) {
        setImagePreview(editCreation.image_url)
      }
    } else if (initialMode) {
      setMode(initialMode)
      if (initialMode === 'image') {
        setTimeout(() => fileInputRef.current?.click(), 100)
      }
    }
  }, [isOpen, initialMode, editCreation])

  const reset = () => {
    setMode(null)
    setTitle('')
    setTextContent('')
    setImageFile(null)
    setImagePreview(null)
    setIsVisible(true)
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!profile?.id) return
    setSaving(true)

    try {
      let image_url = isEditing && editCreation.image_url ? editCreation.image_url : null

      // Upload new image if one was selected
      if (mode === 'image' && imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${profile.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('creation-images')
          .upload(path, imageFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('creation-images')
          .getPublicUrl(path)
        image_url = urlData.publicUrl
      }

      if (isEditing) {
        // Update existing creation
        const updates = {
          title: title.trim() || null,
          is_visible: isVisible,
        }
        if (mode === 'text') updates.text_content = textContent
        if (mode === 'image' && image_url) updates.image_url = image_url

        const { data, error } = await supabase
          .from('creations')
          .update(updates)
          .eq('id', editCreation.id)
          .eq('user_id', profile.id)
          .select()
          .single()

        if (error) throw error

        onUpdated?.(data)
      } else {
        // Insert new creation
        const { data, error } = await supabase
          .from('creations')
          .insert({
            user_id: profile.id,
            type: mode,
            title: title.trim() || null,
            text_content: mode === 'text' ? textContent : null,
            image_url: mode === 'image' ? image_url : null,
            is_visible: isVisible,
          })
          .select()
          .single()

        if (error) throw error

        onCreated(data)
      }

      handleClose()
    } catch (err) {
      console.error('Error saving:', err)
      alert('Failed to save creation')
    } finally {
      setSaving(false)
    }
  }

  const canSave = mode === 'text'
    ? textContent.trim().length > 0
    : mode === 'image'
      ? (imageFile !== null || (isEditing && imagePreview))
      : false

  return (
    <PortraitModal isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Edit creation' : 'Add a creation'} maxWidth="460px">
      {/* Mode selection */}
      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => setMode('text')}
            style={{
              padding: '20px',
              background: '#FFFEFA',
              border: 'none',
              borderRadius: '10px',
              boxShadow: '2px 3px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '15px',
              color: '#2C2C2C',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
          >
            ✍️ Write something
            <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
              Poem, note, short prose, quote
            </div>
          </button>

          <button
            onClick={() => { setMode('image'); setTimeout(() => fileInputRef.current?.click(), 100) }}
            style={{
              padding: '20px',
              background: '#FFFEFA',
              border: 'none',
              borderRadius: '10px',
              boxShadow: '2px 3px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '15px',
              color: '#2C2C2C',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
          >
            📷 Upload an image
            <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
              Screenshot, photograph, drawing
            </div>
          </button>
        </div>
      )}

      {/* Text creation form */}
      {mode === 'text' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            style={{
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              fontSize: '16px',
              background: '#FFFEFA',
              outline: 'none',
            }}
          />

          <div style={{ position: 'relative' }}>
            <textarea
              placeholder="Write something..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value.slice(0, 2000))}
              rows={8}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'Source Serif 4, Georgia, serif',
                lineHeight: 1.65,
                background: '#FFFEFA',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '11px', color: '#999' }}>
              {textContent.length}/2000
            </div>
          </div>
        </div>
      )}

      {/* Image creation form */}
      {mode === 'image' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            style={{
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              fontSize: '16px',
              background: '#FFFEFA',
              outline: 'none',
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {imagePreview ? (
            <div style={{ position: 'relative' }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  background: '#F5F1EB',
                }}
              />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); fileInputRef.current.value = '' }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '40px 20px',
                background: '#F5F1EB',
                border: '2px dashed rgba(0,0,0,0.15)',
                borderRadius: '10px',
                cursor: 'pointer',
                color: '#999',
                fontSize: '14px',
              }}
            >
              Tap to choose an image
            </button>
          )}
        </div>
      )}

      {/* Visibility + Save */}
      {mode && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setIsVisible(!isVisible)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isVisible ? '👁️' : '👁️‍🗨️'}
            {isVisible ? 'Visible to friends' : 'Hidden from friends'}
          </button>

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
              onClick={handleSave}
              disabled={!canSave || saving}
              style={{
                padding: '8px 20px',
                background: canSave && !saving ? '#2C2C2C' : '#ccc',
                color: '#FFFEFA',
                border: 'none',
                borderRadius: '8px',
                cursor: canSave && !saving ? 'pointer' : 'default',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </PortraitModal>
  )
}
