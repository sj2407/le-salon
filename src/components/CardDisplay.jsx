import { ReadingIcon } from './icons/ReadingIcon'
import { VinylIcon } from './icons/VinylIcon'
import { MusicEntryDisplay } from './music/MusicEntryDisplay'
import { WatchingIcon } from './icons/WatchingIcon'
import { LookingForwardIcon } from './icons/LookingForwardIcon'
import { ObsessingIcon } from './icons/ObsessingIcon'
import { AIPromptIcon } from './icons/AIPromptIcon'

const CATEGORY_CONFIG = {
  'Reading': { icon: ReadingIcon, subcategories: ['book', 'article'] },
  'Listening': { icon: VinylIcon, subcategories: ['music', 'podcast', 'audiobook'] },
  'Watching': { icon: WatchingIcon, subcategories: ['tv', 'movie'] },
  'Looking Forward To': { icon: LookingForwardIcon, subcategories: [] },
  'Obsessing Over': { icon: ObsessingIcon, subcategories: [] },
  'My latest AI prompt': { icon: AIPromptIcon, subcategories: [] }
}

const linkifyText = (text) => {
  // Check if text ends with a URL (most common pattern)
  // Changed \s+ to \s* to handle URLs with no space before them
  const urlAtEndRegex = /^(.+?)\s*(https?:\/\/[^\s]+)$/
  const matchEnd = text.match(urlAtEndRegex)

  if (matchEnd) {
    const [, title, url] = matchEnd
    return (
      <a
        href={url.trim()}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#4A7BA7',
          textDecoration: 'underline'
        }}
      >
        {title.trim()}
      </a>
    )
  }

  // Check if text contains "Title | URL" format
  if (text.includes(' | http')) {
    const [title, url] = text.split(' | ')
    return (
      <a
        href={url.trim()}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#4A7BA7',
          textDecoration: 'underline'
        }}
      >
        {title.trim()}
      </a>
    )
  }

  // If no URL detected, return plain text
  return text
}

export const CardDisplay = ({ card, entries, displayName, photoUrl, isEditable = false, onEdit, onSectionEdit }) => {
  const formatDate = (date) => {
    const d = new Date(date)
    const options = { month: 'long', day: 'numeric', year: 'numeric' }
    return `Week of ${d.toLocaleDateString('en-US', options)}`
  }

  const getEntriesForCategory = (category) => {
    return entries.filter(e => e.category === category)
  }

  const renderCategorySection = (categoryName, isFullWidth = false) => {
    const config = CATEGORY_CONFIG[categoryName]
    const Icon = config.icon
    const categoryEntries = getEntriesForCategory(categoryName)

    const sectionClass = isFullWidth ? 'full-width-section' : 'section-box'

    // Special cases for title formatting
    let titleText
    if (categoryName === 'Listening') {
      titleText = `What I'm ${categoryName.toLowerCase()} to`
    } else if (categoryName === 'My latest AI prompt') {
      titleText = categoryName // Keep as is, don't add "What I'm"
    } else {
      titleText = `What I'm ${categoryName.toLowerCase()}`
    }

    // Categories with floating top-right corner icons
    const hasFloatingIcon = ['Reading', 'Listening', 'Watching', 'Looking Forward To', 'Obsessing Over', 'My latest AI prompt'].includes(categoryName)

    // Different positioning for different icons
    let iconPosition = { top: '-10px', right: '5px' }
    if (categoryName === 'Reading' || categoryName === 'Watching' || categoryName === 'Obsessing Over') {
      iconPosition = { top: '-10px', right: '45px' }
    }
    // Move TV and agenda icons to the right
    if (categoryName === 'Watching') {
      iconPosition = { top: '-10px', right: '30px' }
    }
    if (categoryName === 'Looking Forward To') {
      iconPosition = { top: '-10px', right: '-20px' }
    }

    return (
      <div key={categoryName} className={sectionClass} style={hasFloatingIcon ? { position: 'relative', overflow: 'visible' } : {}}>
        {hasFloatingIcon && (
          <div style={{ position: 'absolute', ...iconPosition, zIndex: 10 }}>
            <Icon />
          </div>
        )}
        {isEditable && onSectionEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSectionEdit(categoryName)
            }}
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              opacity: 0.4,
              fontSize: '12px',
              lineHeight: 1,
              zIndex: 5
            }}
            title={`Edit ${categoryName}`}
          >
            ✏️
          </button>
        )}
        <div className="section-header">
          <span className="section-title">{titleText}</span>
          {!hasFloatingIcon && <Icon />}
        </div>
        <div className="section-content">
          {config.subcategories.length > 0 ? (
            categoryEntries.length > 0 ? (
              categoryEntries.map(entry => (
                <div key={entry.id} className="item">
                  {entry.subcategory && <p className="item-label">{entry.subcategory}</p>}
                  {entry.subcategory === 'music' && entry.itunes_preview_url ? (
                    <MusicEntryDisplay entry={entry} />
                  ) : (
                    <p className="item-text">{linkifyText(entry.content)}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="item-text" style={{ color: '#999' }}>Nothing yet...</p>
            )
          ) : (
            categoryEntries.length > 0 ? (
              (categoryName === 'Obsessing Over' || categoryName === 'Looking Forward To' || categoryName === 'My latest AI prompt') ? (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {categoryEntries[0].content.split('\n').filter(line => line.trim()).map((line, index) => (
                    <li key={index} className="item-text" style={{ marginBottom: '8px' }}>
                      {linkifyText(line)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="freeform-text">{linkifyText(categoryEntries[0].content)}</p>
              )
            ) : (
              <p className="freeform-text" style={{ color: '#999' }}>Nothing yet...</p>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
      <header className="card-header" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', marginBottom: '12px', marginLeft: '100px' }}>
          <h1 className="card-name">{displayName}</h1>
          {photoUrl && (
            <img
              src={photoUrl}
              alt={displayName}
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #2C2C2C',
                boxShadow: '4px 4px 0 #2C2C2C',
                filter: 'contrast(1.1) saturate(1.2) brightness(1.05)'
              }}
            />
          )}
        </div>
        {card && <p className="card-date">{formatDate(card.created_at)}</p>}
      </header>

      <div className="grid">
        {renderCategorySection('Reading')}
        {renderCategorySection('Listening')}
        {renderCategorySection('Watching')}
        {renderCategorySection('Looking Forward To')}
      </div>

      {renderCategorySection('Obsessing Over', true)}
      <div style={{ marginTop: '16px' }}>
        {renderCategorySection('My latest AI prompt', true)}
      </div>

      {isEditable && (
        <button onClick={onEdit} className="edit-button" style={{ marginTop: '20px', width: '100%' }}>
          Edit My Card
        </button>
      )}
    </div>
  )
}
