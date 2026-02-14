import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MusicEntryInput } from './music/MusicEntryInput'
import { CATEGORY_CONFIG } from '../lib/cardConstants'

export const SectionEditModal = ({ category, entries, onSave, onClose }) => {
  const config = CATEGORY_CONFIG[category]
  const backdropRef = useRef(null)

  // Initialize form data ONCE on mount using initializer function (not useEffect)
  const [formData, setFormData] = useState(() => {
    const categoryEntries = entries.filter(e => e.category === category)
    if (config.subcategories.length > 0) {
      const data = {}
      config.subcategories.forEach(sub => {
        const subEntries = categoryEntries.filter(e => e.subcategory === sub)
        data[sub] = subEntries.length > 0 ? subEntries.map(e => e.content) : ['']
      })
      return data
    }
    return { content: categoryEntries[0]?.content || '' }
  })

  // Store initial snapshot in state (not ref) to avoid reading ref during render
  const [initialFormDataSnapshot] = useState(() => JSON.stringify(formData))

  const [musicMetadata, setMusicMetadata] = useState(() => {
    const categoryEntries = entries.filter(e => e.category === category)
    const metadata = {}
    if (config.subcategories.includes('music')) {
      const musicEntries = categoryEntries.filter(e => e.subcategory === 'music')
      musicEntries.forEach((e, idx) => {
        if (e.itunes_preview_url) {
          metadata[idx] = {
            itunes_track_id: e.itunes_track_id,
            itunes_preview_url: e.itunes_preview_url,
            itunes_artist_name: e.itunes_artist_name,
            itunes_album_name: e.itunes_album_name,
            itunes_artwork_url: e.itunes_artwork_url
          }
        }
      })
    }
    return metadata
  })

  const isDirty = JSON.stringify(formData) !== initialFormDataSnapshot

  // Escape key handler - only close if form is clean
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isDirty) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, isDirty])

  const handleChange = (subcategory, index, value) => {
    if (config.subcategories.length > 0) {
      setFormData(prev => ({
        ...prev,
        [subcategory]: prev[subcategory].map((v, i) => i === index ? value : v)
      }))
    } else {
      setFormData({ content: value })
    }
  }

  const addEntry = (subcategory) => {
    setFormData(prev => ({
      ...prev,
      [subcategory]: [...prev[subcategory], '']
    }))
  }

  const removeEntry = (subcategory, index) => {
    setFormData(prev => ({
      ...prev,
      [subcategory]: prev[subcategory].filter((_, i) => i !== index).length > 0
        ? prev[subcategory].filter((_, i) => i !== index)
        : ['']
    }))

    // If removing a music entry, shift metadata indices down
    if (subcategory === 'music') {
      setMusicMetadata(prev => {
        const newMeta = {}
        Object.keys(prev).forEach(key => {
          const keyNum = parseInt(key)
          if (keyNum < index) {
            newMeta[keyNum] = prev[key]
          } else if (keyNum > index) {
            newMeta[keyNum - 1] = prev[key]
          }
          // Skip the removed index
        })
        return newMeta
      })
    }
  }

  const handleMusicChange = (index, value, metadata) => {
    handleChange('music', index, value)
    setMusicMetadata(prev => {
      if (metadata) {
        return { ...prev, [index]: metadata }
      } else {
        const newMeta = { ...prev }
        delete newMeta[index]
        return newMeta
      }
    })
  }

  const handleSave = () => {
    const newEntries = []

    if (config.subcategories.length > 0) {
      config.subcategories.forEach(subcategory => {
        const contents = formData[subcategory] || []
        contents.forEach((content, index) => {
          if (content.trim()) {
            const entry = { category, subcategory, content: content.trim() }
            if (subcategory === 'music' && musicMetadata[index]) {
              Object.assign(entry, musicMetadata[index])
            }
            newEntries.push(entry)
          }
        })
      })
    } else {
      const content = formData.content
      if (content.trim()) {
        newEntries.push({ category, subcategory: null, content: content.trim() })
      }
    }

    onSave(category, newEntries)
  }

  // Title formatting
  let titleText
  if (category === 'Listening') {
    titleText = `What I'm ${category.toLowerCase()} to`
  } else if (category === 'My latest AI prompt') {
    titleText = category
  } else if (category === 'Performing Arts and Exhibits') {
    titleText = 'What I saw live'
  } else {
    titleText = `What I'm ${category.toLowerCase()}`
  }

  // Handle backdrop click - only close if clicking directly on backdrop AND form is clean
  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current && !isDirty) {
      onClose()
    }
  }

  return createPortal(
    <div
      ref={backdropRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: '#FFFEFA',
          border: '1px solid #2C2C2C',
          borderRadius: '4px',
          padding: '20px',
          width: '90%',
          maxWidth: '400px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '4px 4px 0 #2C2C2C'
        }}
      >
        <h3 className="handwritten" style={{ fontSize: '24px', marginBottom: '20px', marginTop: 0 }}>
          {titleText}
        </h3>

        {config.subcategories.length > 0 ? (
          config.subcategories.map(sub => (
            <div key={sub} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  {sub}
                </label>
                <button
                  type="button"
                  onClick={() => addEntry(sub)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '14px',
                    background: '#FFFEFA',
                    border: '1px solid #2C2C2C',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  +
                </button>
              </div>
              {formData[sub]?.map((content, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {sub === 'music' ? (
                    <MusicEntryInput
                      value={content}
                      metadata={musicMetadata[index]}
                      onChange={(value, meta) => handleMusicChange(index, value, meta)}
                      onRemove={formData[sub].length > 1 ? () => removeEntry(sub, index) : null}
                      placeholder="Song/Artist"
                    />
                  ) : (
                    <>
                      <input
                        type="text"
                        value={content}
                        onChange={(e) => handleChange(sub, index, e.target.value)}
                        placeholder={`${sub}...`}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          fontSize: '14px'
                        }}
                      />
                      {formData[sub].length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(sub, index)}
                          style={{
                            padding: '8px 12px',
                            background: '#FFE5E5',
                            border: '1px solid #C75D5D',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            color: '#C75D5D'
                          }}
                        >
                          ×
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))
        ) : (
          <textarea
            value={formData.content || ''}
            onChange={(e) => handleChange(null, 0, e.target.value)}
            placeholder={category === 'My latest AI prompt' ? 'What did you ask AI lately?' : `What are you ${category.toLowerCase()}?`}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#2C2C2C',
              color: '#FFFEFA',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Save
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#FFFEFA',
              border: '1px solid #2C2C2C',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
