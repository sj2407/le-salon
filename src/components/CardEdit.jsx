import { useState, useEffect } from 'react'
import { ReadingIcon } from './icons/ReadingIcon'
import { ListeningIcon } from './icons/ListeningIcon'
import { WatchingIcon } from './icons/WatchingIcon'
import { LookingForwardIcon } from './icons/LookingForwardIcon'
import { ObsessingIcon } from './icons/ObsessingIcon'

const CATEGORY_CONFIG = {
  'Reading': { icon: ReadingIcon, subcategories: ['book', 'article'] },
  'Listening': { icon: ListeningIcon, subcategories: ['music', 'podcast', 'audiobook'] },
  'Watching': { icon: WatchingIcon, subcategories: ['tv', 'movie'] },
  'Looking Forward To': { icon: LookingForwardIcon, subcategories: [] },
  'Obsessing Over': { icon: ObsessingIcon, subcategories: [] }
}

export const CardEdit = ({ entries, displayName, onSave, onCancel }) => {
  const [formData, setFormData] = useState({})

  useEffect(() => {
    const data = {}
    Object.keys(CATEGORY_CONFIG).forEach(category => {
      const config = CATEGORY_CONFIG[category]
      const categoryEntries = entries.filter(e => e.category === category)

      if (config.subcategories.length > 0) {
        data[category] = {}
        config.subcategories.forEach(sub => {
          const subEntries = categoryEntries.filter(e => e.subcategory === sub)
          data[category][sub] = subEntries.length > 0
            ? subEntries.map(e => e.content)
            : ['']
        })
      } else {
        data[category] = categoryEntries[0]?.content || ''
      }
    })
    setFormData(data)
  }, [entries])

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
  }

  const handleSave = () => {
    const newEntries = []

    Object.keys(formData).forEach(category => {
      const config = CATEGORY_CONFIG[category]

      if (config.subcategories.length > 0) {
        Object.keys(formData[category]).forEach(subcategory => {
          const contents = formData[category][subcategory]
          contents.forEach(content => {
            if (content.trim()) {
              newEntries.push({
                category,
                subcategory,
                content: content.trim()
              })
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
    const Icon = config.icon
    const sectionClass = isFullWidth ? 'full-width-section' : 'section-box'

    // Special case for "Listening" to add "to"
    const titleText = categoryName === 'Listening'
      ? `What I'm ${categoryName.toLowerCase()} to`
      : `What I'm ${categoryName.toLowerCase()}`

    return (
      <div key={categoryName} className={sectionClass}>
        <div className="section-header">
          <span className="section-title">{titleText}</span>
          <Icon />
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
                    <input
                      type="text"
                      className="edit-input"
                      value={content}
                      onChange={(e) => handleChange(categoryName, sub, index, e.target.value)}
                      placeholder={`e.g., ${
                        sub === 'book' ? 'Book Title' :
                        sub === 'article' ? 'Article Title URL' :
                        sub === 'music' ? 'Song/Artist' :
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
                  </div>
                ))}
              </div>
            ))
          ) : (
            <textarea
              value={formData[categoryName] || ''}
              onChange={(e) => handleChange(categoryName, null, 0, e.target.value)}
              placeholder={`What are you ${categoryName.toLowerCase()}?`}
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
      </div>

      {renderCategoryEdit('Obsessing Over', true)}

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
