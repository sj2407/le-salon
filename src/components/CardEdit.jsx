import { useState } from 'react'
import { MusicEntryInput } from './music/MusicEntryInput'
import { CATEGORY_CONFIG } from '../lib/cardConstants'
import { ReadingIcon } from './icons/ReadingIcon'
import { ListeningIcon } from './icons/ListeningIcon'
import { WatchingIcon } from './icons/WatchingIcon'
import { LookingForwardIcon } from './icons/LookingForwardIcon'
import { PerformingArtsIcon } from './icons/PerformingArtsIcon'
import { ObsessingIcon } from './icons/ObsessingIcon'
import { AIPromptIcon } from './icons/AIPromptIcon'

const CATEGORY_ICONS = {
  'Reading': ReadingIcon,
  'Listening': ListeningIcon,
  'Watching': WatchingIcon,
  'Looking Forward To': LookingForwardIcon,
  'Performing Arts and Exhibits': PerformingArtsIcon,
  'Obsessing Over': ObsessingIcon,
  'My latest AI prompt': AIPromptIcon
}

function buildFormData(entries) {
  const data = {}
  Object.keys(CATEGORY_CONFIG).forEach(category => {
    const config = CATEGORY_CONFIG[category]
    const categoryEntries = entries.filter(e => e.category === category)
    if (config.subcategories.length > 0) {
      data[category] = {}
      config.subcategories.forEach(sub => {
        const subEntries = categoryEntries.filter(e => e.subcategory === sub)
        data[category][sub] = subEntries.length > 0 ? subEntries.map(e => e.content) : ['']
      })
    } else {
      data[category] = categoryEntries[0]?.content || ''
    }
  })
  return data
}

function buildMusicMetadata(entries) {
  const metadata = {}
  const musicEntries = entries.filter(e => e.category === 'Listening' && e.subcategory === 'music')
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
  return metadata
}

export const CardEdit = ({ entries, displayName, onSave, onCancel }) => {
  // Compute initial form data from entries (adjusting state during render, not in effect)
  const [prevEntries, setPrevEntries] = useState(entries)
  const [formData, setFormData] = useState(() => buildFormData(entries))
  const [musicMetadata, setMusicMetadata] = useState(() => buildMusicMetadata(entries))
  if (prevEntries !== entries) {
    setPrevEntries(entries)
    setFormData(buildFormData(entries))
    setMusicMetadata(buildMusicMetadata(entries))
  }

  const handleChange = (category, subcategory, index, value) => {
    setFormData(prev => {
      if (subcategory !== null) {
        const newSubArray = [...prev[category][subcategory]]
        newSubArray[index] = value
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [subcategory]: newSubArray
          }
        }
      }
      return {
        ...prev,
        [category]: value
      }
    })
  }

  const addEntry = (category, subcategory) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: [...prev[category][subcategory], '']
      }
    }))
  }

  const removeEntry = (category, subcategory, index) => {
    setFormData(prev => {
      const newSubArray = prev[category][subcategory].filter((_, i) => i !== index)
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [subcategory]: newSubArray.length > 0 ? newSubArray : ['']
        }
      }
    })

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
    handleChange('Listening', 'music', index, value)
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

    Object.keys(formData).forEach(category => {
      const config = CATEGORY_CONFIG[category]

      if (config.subcategories.length > 0) {
        Object.keys(formData[category]).forEach(subcategory => {
          const contents = formData[category][subcategory]
          contents.forEach((content, index) => {
            if (content.trim()) {
              const entry = {
                category,
                subcategory,
                content: content.trim()
              }
              // Add iTunes metadata for music entries
              if (subcategory === 'music' && musicMetadata[index]) {
                Object.assign(entry, musicMetadata[index])
              }
              newEntries.push(entry)
            }
          })
        })
      } else {
        const content = formData[category]
        if (content.trim()) {
          newEntries.push({
            category,
            subcategory: null,
            content: content.trim()
          })
        }
      }
    })

    onSave(newEntries)
  }

  const renderCategoryEdit = (categoryName, isFullWidth = false) => {
    const config = CATEGORY_CONFIG[categoryName]
    const Icon = CATEGORY_ICONS[categoryName]
    const sectionClass = isFullWidth ? 'full-width-section' : 'section-box'

    // Special case for "Listening" to add "to"
    const titleText = categoryName === 'Listening'
      ? `What I'm ${categoryName.toLowerCase()} to`
      : `What I'm ${categoryName.toLowerCase()}`

    return (
      <div key={categoryName} className={sectionClass}>
        <div className="section-header">
          <span className="section-title">{titleText}</span>
          {Icon && <Icon />}
        </div>
        <div className="section-content">
          {config.subcategories.length > 0 ? (
            config.subcategories.map(sub => (
              <div key={sub} className="item">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p className="item-label">{sub}</p>
                  <button
                    type="button"
                    onClick={() => addEntry(categoryName, sub)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '16px',
                      lineHeight: '1',
                      background: '#FFFEFA',
                      border: '1.5px solid #2C2C2C',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                    title={`Add another ${sub}`}
                  >
                    +
                  </button>
                </div>
                {formData[categoryName]?.[sub]?.map((content, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    {sub === 'music' ? (
                      <MusicEntryInput
                        value={content}
                        metadata={musicMetadata[index]}
                        onChange={(value, meta) => handleMusicChange(index, value, meta)}
                        onRemove={formData[categoryName][sub].length > 1 ? () => removeEntry(categoryName, sub, index) : null}
                        placeholder="Song/Artist"
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          className="edit-input"
                          value={content}
                          onChange={(e) => handleChange(categoryName, sub, index, e.target.value)}
                          placeholder={`e.g., ${
                            sub === 'book' ? 'Book Title' :
                            sub === 'article' ? 'Article Title URL' :
                            sub === 'podcast' ? 'Podcast Name' :
                            sub === 'audiobook' ? 'Audiobook Title' :
                            sub === 'tv' ? 'Show Title' :
                            sub === 'movie' ? 'Movie Title' :
                            'Title'
                          }`}
                          style={{ flex: 1 }}
                        />
                        {formData[categoryName][sub].length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEntry(categoryName, sub, index)}
                            style={{
                              padding: '8px 12px',
                              fontSize: '14px',
                              background: '#FFE5E5',
                              border: '1.5px solid #C75D5D',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              color: '#C75D5D'
                            }}
                            title="Remove"
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
              value={formData[categoryName] || ''}
              onChange={(e) => handleChange(categoryName, null, 0, e.target.value)}
              placeholder={
                categoryName === 'My latest AI prompt'
                  ? 'What did you ask AI lately?'
                  : `What are you ${categoryName.toLowerCase()}?`
              }
              style={{ minHeight: isFullWidth ? '100px' : '80px' }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <header className="card-header">
        <h1 className="card-name">{displayName}</h1>
        <p className="card-date" style={{ color: '#E85D75' }}>Editing...</p>
      </header>

      <div className="grid">
        {renderCategoryEdit('Reading')}
        {renderCategoryEdit('Listening')}
        {renderCategoryEdit('Watching')}
        {renderCategoryEdit('Looking Forward To')}
        {renderCategoryEdit('Performing Arts and Exhibits')}
        {renderCategoryEdit('Obsessing Over')}
      </div>

      {renderCategoryEdit('My latest AI prompt', true)}

      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <button onClick={handleSave} className="primary" style={{ flex: 1 }}>
          Save Changes
        </button>
        <button onClick={onCancel} style={{ flex: 1 }}>
          Cancel
        </button>
      </div>

    </div>
  )
}
