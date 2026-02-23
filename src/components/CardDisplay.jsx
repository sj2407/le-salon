import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { linkifyText } from '../lib/linkifyText'
import { MusicEntryDisplay } from './music/MusicEntryDisplay'
import { CATEGORY_CONFIG } from '../lib/cardConstants'
import { ReadingIcon } from './icons/ReadingIcon'
import { VinylIcon } from './icons/VinylIcon'
import { WatchingIcon } from './icons/WatchingIcon'
import { LookingForwardIcon } from './icons/LookingForwardIcon'
import { PerformingArtsIcon } from './icons/PerformingArtsIcon'
import { ObsessingIcon } from './icons/ObsessingIcon'
import { AIPromptIcon } from './icons/AIPromptIcon'
import { FlippableSection } from './marginalia/FlippableSection'
import { CardBack } from './marginalia/CardBack'
import { CardFold } from './marginalia/CardFold'

const CATEGORY_ICONS = {
  'Reading': ReadingIcon,
  'Listening': VinylIcon,
  'Watching': WatchingIcon,
  'Looking Forward To': LookingForwardIcon,
  'Performing Arts and Exhibits': PerformingArtsIcon,
  'Obsessing Over': ObsessingIcon,
  'My latest AI prompt': AIPromptIcon
}

export const CardDisplay = ({
  card,
  entries,
  displayName,
  photoUrl,
  photoPosition,
  isEditable = false,
  onEdit,
  onSectionEdit,
  onDictate,
  showDictateButton = false,
  // Profile props
  bio,
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
  const [stats, setStats] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const statsRef = useRef(null)
  const nameRef = useRef(null)

  // Prefetch stats on mount — lightweight count-only queries
  const statsOwnerId = card?.user_id
  useEffect(() => {
    if (!statsOwnerId) return
    Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', statsOwnerId),
      supabase.from('wishlist_items').select('id', { count: 'exact', head: true }).eq('user_id', statsOwnerId),
      supabase.from('friendships').select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${statsOwnerId},recipient_id.eq.${statsOwnerId}`),
    ]).then(([reviews, wishlist, friends]) => {
      setStats({
        reviews: reviews.count ?? 0,
        wishlist: wishlist.count ?? 0,
        friends: friends.count ?? 0,
      })
    })
  }, [statsOwnerId])

  // Close stats popover on click outside or Escape
  useEffect(() => {
    if (!showStats) return
    const handleClick = (e) => {
      if (
        nameRef.current && !nameRef.current.contains(e.target) &&
        statsRef.current && !statsRef.current.contains(e.target)
      ) setShowStats(false)
    }
    const handleEscape = (e) => { if (e.key === 'Escape') setShowStats(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showStats])

  const handleNameInteraction = () => {
    if (stats) setShowStats(prev => !prev)
  }

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
    const Icon = CATEGORY_ICONS[categoryName]
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
      <header className="card-header" style={{ marginBottom: isEditable ? '0px' : '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px', marginLeft: '100px' }}>
          <div ref={nameRef} style={{ position: 'relative' }}>
            <h1
              className="card-name"
              style={{
                transform: 'translateY(12px)',
                cursor: 'pointer',
              }}
              onClick={handleNameInteraction}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse' && stats) setShowStats(true) }}
              onPointerLeave={(e) => { if (e.pointerType === 'mouse') setShowStats(false) }}
            >
              {displayName}
            </h1>
            {showStats && (
              <div
                ref={statsRef}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') setShowStats(true) }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') setShowStats(false) }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#FFFEFA',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                  padding: '10px 16px',
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'nowrap',
                  gap: '20px',
                  whiteSpace: 'nowrap',
                  zIndex: 50,
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Caveat', cursive", fontSize: '22px', fontWeight: 600, color: '#2C2C2C', lineHeight: 1 }}>{stats.reviews}</div>
                  <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Reviews</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Caveat', cursive", fontSize: '22px', fontWeight: 600, color: '#2C2C2C', lineHeight: 1 }}>{stats.wishlist}</div>
                  <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Wishlist</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Caveat', cursive", fontSize: '22px', fontWeight: 600, color: '#2C2C2C', lineHeight: 1 }}>{stats.friends}</div>
                  <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Friends</div>
                </div>
              </div>
            )}
          </div>
          {photoUrl && (
            <img
              src={photoUrl}
              alt={displayName}
              style={{
                width: '109px',
                height: '109px',
                borderRadius: '50%',
                objectFit: 'cover',
                objectPosition: photoPosition || '50% 50%',
                border: 'none',
                filter: 'contrast(1.1) saturate(1.2) brightness(1.05)'
              }}
            />
          )}
        </div>
        {bio && (
          <p style={{
            fontSize: '14px',
            color: '#777',
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: '4px',
            marginBottom: '0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '280px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            {bio}
          </p>
        )}
        {card && <p className="card-date">{formatDate(card.created_at)}</p>}
      </header>

      {isEditable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
          <button onClick={onEdit} className="edit-button" style={{ margin: 0, paddingLeft: 0, paddingRight: '4px', fontSize: '21px' }}>
            Edit My Card
          </button>
          {showDictateButton && (
            <button
              onClick={onDictate}
              title="Dictate entries by voice"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}
        </div>
      )}

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

    </div>
  )
}
