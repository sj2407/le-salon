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
          const entry = categoryEntries.find(e => e.subcategory === sub)
          data[category][sub] = entry?.content || ''
        })
      } else {
        data[category] = categoryEntries[0]?.content || ''
      }
    })
    setFormData(data)
  }, [entries])

  const handleChange = (category, subcategory, value) => {
    setFormData(prev => {
      if (subcategory) {
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [subcategory]: value
          }
        }
      }
      return {
        ...prev,
        [category]: value
      }
    })
  }

  const handleSave = () => {
    const newEntries = []

    Object.keys(formData).forEach(category => {
      const config = CATEGORY_CONFIG[category]

      if (config.subcategories.length > 0) {
        Object.keys(formData[category]).forEach(subcategory => {
          const content = formData[category][subcategory]
          if (content.trim()) {
            newEntries.push({
              category,
              subcategory,
              content: content.trim()
            })
          }
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

    return (
      <div key={categoryName} className={sectionClass}>
        <div className="section-header">
          <span className="section-title">{`What I'm ${categoryName.toLowerCase()}`}</span>
          <Icon />
        </div>
        <div className="section-content">
          {config.subcategories.length > 0 ? (
            config.subcategories.map(sub => (
              <div key={sub} className="item">
                <p className="item-label">{sub}</p>
                <input
                  type="text"
                  className="edit-input"
                  value={formData[categoryName]?.[sub] || ''}
                  onChange={(e) => handleChange(categoryName, sub, e.target.value)}
                  placeholder={`e.g., ${sub === 'book' ? 'Tomorrow, and Tomorrow, and Tomorrow' : 'The Great Displacement'}`}
                />
              </div>
            ))
          ) : (
            <textarea
              value={formData[categoryName] || ''}
              onChange={(e) => handleChange(categoryName, null, e.target.value)}
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
