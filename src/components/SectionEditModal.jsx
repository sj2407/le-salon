import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MusicEntryInput } from './music/MusicEntryInput'
import { CATEGORY_CONFIG } from '../lib/cardConstants'

export const SectionEditModal = ({ category, entries, onSave, onClose }) => {
  const config = CATEGORY_CONFIG[category]
  const backdropRef = useRef(null)
  const isEntryOptionsMode = Array.isArray(config.entryOptions) && config.entryOptions.length > 0

  // Initialize form data ONCE on mount using initializer function (not useEffect)
  const [formData, setFormData] = useState(() => {
    const categoryEntries = entries.filter(e => e.category === category)

    if (isEntryOptionsMode) {
      // Per-entry shape: each row has its own subcategory picked from entryOptions.
      // Entries with legacy subcategory values not in entryOptions still render —
      // their value stays in the dropdown so nothing is lost.
      const rows = categoryEntries.map(e => ({
        content: e.content,
        subcategory: e.subcategory || config.entryOptions[0],
      }))
      return { rows: rows.length > 0 ? rows : [{ content: '', subcategory: config.entryOptions[0] }] }
    }

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

    if (isEntryOptionsMode) {
      ;(formData.rows || []).forEach(row => {
        if (row.content && row.content.trim()) {
          newEntries.push({
            category,
            subcategory: row.subcategory,
            content: row.content.trim(),
          })
        }
      })
    } else if (config.subcategories.length > 0) {
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

  // No click-outside-to-close — user must use Cancel or Save

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
      onClick={undefined}
    >
      <div
        style={{
          background: '#FFFEFA',
          borderRadius: '4px',
          padding: '14px',
          width: '90%',
          maxWidth: '400px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
        }}
      >
        <h3 className="handwritten" style={{ fontSize: '22px', marginBottom: '10px', marginTop: 0, textAlign: 'center' }}>
          {titleText}
        </h3>

        {isEntryOptionsMode ? (
          <>
            {(formData.rows || []).map((row, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={row.content}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    rows: prev.rows.map((r, i) => i === index ? { ...r, content: e.target.value } : r)
                  }))}
                  placeholder="What did you see?"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    fontSize: '16px',
                    minWidth: 0,
                  }}
                />
                <select
                  value={config.entryOptions.includes(row.subcategory) ? row.subcategory : ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    rows: prev.rows.map((r, i) => i === index ? { ...r, subcategory: e.target.value } : r)
                  }))}
                  style={{
                    width: 'auto',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    fontSize: '14px',
                    background: '#FFFEFA',
                    flexShrink: 0,
                  }}
                >
                  {!config.entryOptions.includes(row.subcategory) && row.subcategory && (
                    <option value={row.subcategory}>{row.subcategory}</option>
                  )}
                  {config.entryOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {(formData.rows.length > 1) && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      rows: prev.rows.filter((_, i) => i !== index)
                    }))}
                    style={{
                      padding: '8px 10px',
                      background: '#FFE5E5',
                      border: '1px solid #C75D5D',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      color: '#C75D5D',
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData(prev => ({
                ...prev,
                rows: [...prev.rows, { content: '', subcategory: config.entryOptions[0] }]
              }))}
              style={{
                width: '100%',
                padding: '8px',
                background: 'none',
                border: '1px dashed #c8b89c',
                borderRadius: '3px',
                cursor: 'pointer',
                color: '#888',
                fontStyle: 'italic',
                fontSize: '14px',
                marginTop: '4px',
              }}
            >
              + add an entry
            </button>
          </>
        ) : config.subcategories.length > 0 ? (
          config.subcategories.map(sub => (
            <div key={sub} style={{ marginBottom: '8px' }}>
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
                    border: '1px solid #ccc',
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
                          fontSize: '16px'
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
              fontSize: '16px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '8px 14px',
              background: '#622722',
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
              padding: '8px 14px',
              background: '#FFFEFA',
              border: '1px solid #ccc',
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
