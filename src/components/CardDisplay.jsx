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

export const CardDisplay = ({ card, entries, displayName, isEditable = false, onEdit }) => {
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

    return (
      <div key={categoryName} className={sectionClass}>
        <div className="section-header">
          <span className="section-title">{`What I'm ${categoryName.toLowerCase()}`}</span>
          <Icon />
        </div>
        <div className="section-content">
          {config.subcategories.length > 0 ? (
            categoryEntries.length > 0 ? (
              categoryEntries.map(entry => (
                <div key={entry.id} className="item">
                  {entry.subcategory && <p className="item-label">{entry.subcategory}</p>}
                  <p className="item-text">{entry.content}</p>
                </div>
              ))
            ) : (
              <p className="item-text" style={{ color: '#999' }}>Nothing yet...</p>
            )
          ) : (
            categoryEntries.length > 0 ? (
              <p className="freeform-text">{categoryEntries[0].content}</p>
            ) : (
              <p className="freeform-text" style={{ color: '#999' }}>Nothing yet...</p>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <header className="card-header">
        <h1 className="card-name">{displayName}</h1>
        {card && <p className="card-date">{formatDate(card.created_at)}</p>}
      </header>

      <div className="grid">
        {renderCategorySection('Reading')}
        {renderCategorySection('Listening')}
        {renderCategorySection('Watching')}
        {renderCategorySection('Looking Forward To')}
      </div>

      {renderCategorySection('Obsessing Over', true)}

      {isEditable && (
        <button onClick={onEdit} className="edit-button" style={{ marginTop: '20px', width: '100%' }}>
          Edit My Card
        </button>
      )}
    </div>
  )
}
