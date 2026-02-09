import { useState } from 'react'
import { ReadingIcon } from './icons/ReadingIcon'
import { VinylIcon } from './icons/VinylIcon'
import { MusicEntryDisplay } from './music/MusicEntryDisplay'
import { WatchingIcon } from './icons/WatchingIcon'
import { LookingForwardIcon } from './icons/LookingForwardIcon'
import { PerformingArtsIcon } from './icons/PerformingArtsIcon'
import { ObsessingIcon } from './icons/ObsessingIcon'
import { AIPromptIcon } from './icons/AIPromptIcon'
import { FlippableSection } from './marginalia/FlippableSection'
import { CardBack } from './marginalia/CardBack'
import { CardFold } from './marginalia/CardFold'

const CATEGORY_CONFIG = {
  'Reading': { icon: ReadingIcon, subcategories: ['book', 'article'] },
  'Listening': { icon: VinylIcon, subcategories: ['music', 'podcast', 'audiobook'] },
  'Watching': { icon: WatchingIcon, subcategories: ['tv', 'movie'] },
  'Looking Forward To': { icon: LookingForwardIcon, subcategories: [] },
  'Performing Arts and Exhibits': { icon: PerformingArtsIcon, subcategories: ['musical theatre', 'exhibits'] },
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

export const CardDisplay = ({
  card,
  entries,
  displayName,
  photoUrl,
  isEditable = false,
  onEdit,
  onSectionEdit,
  // Marginalia props
  notes = [],
  isFriendView = false,
  currentUserId,
  onMarkNotesRead,
  onLeaveNote,
  onUpdateNote,
  onDeleteNote,
  onReplyToNote,
  cardOwnerName
}) => {
  const [flippedSections, setFlippedSections] = useState({})

  const formatDate = (date) => {
    const d = new Date(date)
    const options = { month: 'long', day: 'numeric', year: 'numeric' }
    return `Week of ${d.toLocaleDateString('en-US', options)}`
  }

  const getEntriesForCategory = (category) => {
    return entries.filter(e => e.category === category)
  }

  const getNotesForSection = (sectionName) => {
    return notes.filter(n => n.card_section === sectionName)
  }

  const getUnreadNotesForSection = (sectionName) => {
    return notes.filter(n => n.card_section === sectionName && !n.is_read)
  }

  const handleFlipSection = (sectionName) => {
    setFlippedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
  }

  const handleQuillClick = (e, categoryName) => {
    e.stopPropagation()
    if (isFriendView) {
      // On friend's card: quill flips to leave/view note
      handleFlipSection(categoryName)
    } else if (onSectionEdit) {
      // On own card: quill triggers edit
      onSectionEdit(categoryName)
    }
  }

  const renderCategorySection = (categoryName, isFullWidth = false) => {
    const config = CATEGORY_CONFIG[categoryName]
    const Icon = config.icon
    const categoryEntries = getEntriesForCategory(categoryName)
    const sectionNotes = getNotesForSection(categoryName)
    const unreadNotes = getUnreadNotesForSection(categoryName)
    const isFlipped = flippedSections[categoryName] || false

    // Special cases for title formatting
    let titleText
    if (categoryName === 'Listening') {
      titleText = `What I'm ${categoryName.toLowerCase()} to`
    } else if (categoryName === 'My latest AI prompt') {
      titleText = categoryName // Keep as is, don't add "What I'm"
    } else if (categoryName === 'Performing Arts and Exhibits') {
      titleText = 'Performing arts and exhibits'
    } else {
      titleText = `What I'm ${categoryName.toLowerCase()}`
    }

    // Categories with floating top-right corner icons
    const hasFloatingIcon = ['Reading', 'Listening', 'Watching', 'Looking Forward To', 'Performing Arts and Exhibits', 'Obsessing Over', 'My latest AI prompt'].includes(categoryName)

    // Different positioning for different icons
    let iconPosition = { top: '-10px', right: '5px' }
    if (categoryName === 'Reading') {
      iconPosition = { top: '-10px', right: '45px' }
    }
    if (categoryName === 'Watching') {
      iconPosition = { top: '-10px', right: '30px' }
    }
    if (categoryName === 'Looking Forward To') {
      iconPosition = { top: '-10px', right: '-20px' }
    }
    if (categoryName === 'Obsessing Over') {
      iconPosition = { top: '-10px', right: '25px' }
    }
    if (categoryName === 'Performing Arts and Exhibits') {
      iconPosition = { top: '-10px', right: '5px' }
    }

    // Show quill on own card if editable, or on friend's card for notes
    const showQuill = isEditable || isFriendView

    const sectionContent = (
      <div className={isFullWidth ? 'full-width-section' : 'section-box'} style={{ position: 'relative', overflow: 'visible' }}>
        {hasFloatingIcon && !isFlipped && (
          <div style={{
            position: 'absolute',
            ...iconPosition,
            zIndex: 10,
            opacity: isFlipped ? 0 : 1,
            transition: 'opacity 0.2s ease'
          }}>
            <Icon />
          </div>
        )}
        {showQuill && (
          <button
            type="button"
            onClick={(e) => handleQuillClick(e, categoryName)}
            style={{
              position: 'absolute',
              top: '-10px',
              left: '-10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px',
              opacity: isFriendView ? 0.7 : 0.4,
              fontSize: '14px',
              lineHeight: 1,
              zIndex: 15,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
            title={isFriendView ? 'Leave a note' : `Edit ${categoryName}`}
          >
            <img src="/images/quill-ready.png" alt={isFriendView ? 'Leave note' : 'Edit'} style={{ width: '29px', height: '29px', objectFit: 'contain', pointerEvents: 'none' }} />
          </button>
        )}
        {/* Fold indicator for unread notes on own card */}
        {!isFriendView && unreadNotes.length > 0 && (
          <CardFold
            hasUnread={true}
            unreadCount={unreadNotes.length}
            onClick={() => handleFlipSection(categoryName)}
          />
        )}
        <div className="section-header">
          <span className="section-title">{titleText}</span>
          {!hasFloatingIcon && Icon && <Icon />}
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

    const backContent = (
      <CardBack
        sectionName={categoryName}
        notes={sectionNotes}
        isOwner={!isFriendView}
        currentUserId={currentUserId}
        onFlipBack={() => handleFlipSection(categoryName)}
        onMarkRead={onMarkNotesRead}
        onLeaveNote={onLeaveNote}
        onUpdateNote={onUpdateNote}
        onDeleteNote={onDeleteNote}
        onReplyToNote={onReplyToNote}
        ownerName={displayName}
        cardOwnerName={cardOwnerName}
      />
    )

    return (
      <FlippableSection
        key={categoryName}
        isFlipped={isFlipped}
        onFlip={() => handleFlipSection(categoryName)}
        backContent={backContent}
        sectionClass={isFullWidth ? 'full-width-section' : 'section-box'}
      >
        {sectionContent}
      </FlippableSection>
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
                width: '128px',
                height: '128px',
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
        {renderCategorySection('Performing Arts and Exhibits')}
        {renderCategorySection('Obsessing Over')}
      </div>

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
