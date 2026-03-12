import { useState, useEffect, useCallback } from 'react'
import { PortraitCard } from './PortraitCard'
import { MusicSection } from './MusicSection'
import { ReadingSection } from './ReadingSection'
import { CreationSection } from './CreationSection'
import { ExperiencesSection } from './ExperiencesSection'
import { motion, LayoutGroup } from 'framer-motion'
import { Eye, EyeSlash, CaretUp, CaretDown, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { hapticTap } from '../../lib/haptics'

const DEFAULT_SECTIONS = ['music', 'reading', 'experiences', 'creation']

/** Breakpoint must match .grid in index.css (1fr at ≤768px) */
const MOBILE_BREAKPOINT = 768

/**
 * Hook: returns true when viewport is single-column (mobile).
 */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

/** Swipe threshold in pixels to trigger a move */
const SWIPE_THRESHOLD = 40

/**
 * Arrow button for reordering — minimal, no background.
 */
const ArrowButton = ({ direction, onClick }) => {
  const Icon = { up: CaretUp, down: CaretDown, left: CaretLeft, right: CaretRight }[direction]
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); hapticTap(); onClick() }}
      style={{
        background: 'none',
        border: 'none',
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        opacity: 0.45,
        transition: 'opacity 0.15s',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45' }}
      title={`Move ${direction}`}
    >
      <Icon size={14} weight="bold" color="#622722" />
    </button>
  )
}

/**
 * Shared Portrait display component — defines the exact layout structure.
 * Used by both My Corner (Portrait.jsx) and Friend view (FriendCard.jsx).
 *
 * NO className="container" — the parent provides it.
 */
export const PortraitDisplay = ({
  spotifyProfile,
  books,
  readingThemes,
  readingGraph,
  creations,
  experiences,
  isOwner,
  // Action callbacks (owner view only)
  onToggleCreationVisibility,
  onAddCreationText,
  onAddCreationImage,
  onDeleteCreation,
  onViewCreationArchive,
  onAddExperience,
  onScanPlaybill,
  // Navigation callbacks
  onPortraitImageClick,
  onBookClick,
  onThemeClick,
  onExperienceClick,
  onMusicSeeAll,
  onReadingSeeAll,
  // Connect / import callbacks (owner view)
  onConnectSpotify,
  onDisconnectSpotify,
  spotifyConnecting,
  onAddBook,
  onImportGoodreads,
  onScanBookshelf,
  spotifyError,
  // Section preferences (owner view)
  hiddenSections = [],
  onToggleHidden,
  sectionOrder = [],
  onSectionOrderChange,
}) => {
  const isMobile = useIsMobile()
  const hasSpotify = spotifyProfile && spotifyProfile.is_active
  const hasBooks = books && books.length > 0
  const hasCreations = creations && creations.length > 0
  const hasExperiences = experiences && experiences.length > 0

  // Everything empty — full-page prompt for owner
  const everythingEmpty = !hasSpotify && !hasBooks && !hasCreations && !hasExperiences

  if (everythingEmpty && !isOwner) {
    return null
  }

  // Show/hide portrait card based on data
  const showPortraitCard = hasSpotify && spotifyProfile?.mood_label

  // Merge saved order with defaults (same pattern as CardDisplay)
  const gridOrder = sectionOrder.length > 0
    ? [...sectionOrder.filter(s => DEFAULT_SECTIONS.includes(s)),
       ...DEFAULT_SECTIONS.filter(s => !sectionOrder.includes(s))]
    : DEFAULT_SECTIONS

  // Check if a section has data (or is owner) so we know whether to render
  const sectionHasContent = (key) => {
    switch (key) {
      case 'music': return (spotifyProfile?.is_active) || isOwner
      case 'reading': return hasBooks || isOwner
      case 'experiences': return hasExperiences || isOwner
      case 'creation': return hasCreations || isOwner
      default: return false
    }
  }

  // --- Reorder logic ---
  const cols = isMobile ? 1 : 2
  const total = gridOrder.length

  const canMove = useCallback((index, direction) => {
    if (direction === 'up') return index >= cols
    if (direction === 'down') return index + cols < total
    if (direction === 'left') return index % cols > 0
    if (direction === 'right') return index % cols < cols - 1 && index + 1 < total
    return false
  }, [cols, total])

  const handleMove = useCallback((index, direction) => {
    let targetIndex
    if (direction === 'up') targetIndex = index - cols
    else if (direction === 'down') targetIndex = index + cols
    else if (direction === 'left') targetIndex = index - 1
    else if (direction === 'right') targetIndex = index + 1
    else return

    if (targetIndex < 0 || targetIndex >= total) return

    const newOrder = [...gridOrder]
    ;[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]
    onSectionOrderChange?.(newOrder)
  }, [gridOrder, cols, total, onSectionOrderChange])

  /** Swipe handler — detects drag direction and triggers move */
  const handleDragEnd = useCallback((index) => (event, info) => {
    const { offset } = info
    const absX = Math.abs(offset.x)
    const absY = Math.abs(offset.y)

    // Determine dominant axis
    if (absX > absY && absX > SWIPE_THRESHOLD) {
      // Horizontal swipe
      const dir = offset.x > 0 ? 'right' : 'left'
      if (canMove(index, dir)) {
        hapticTap()
        handleMove(index, dir)
      }
    } else if (absY > SWIPE_THRESHOLD) {
      // Vertical swipe
      const dir = offset.y > 0 ? 'down' : 'up'
      if (canMove(index, dir)) {
        hapticTap()
        handleMove(index, dir)
      }
    }
  }, [canMove, handleMove])

  // Map section key → "see all" handler
  const getSeeAllHandler = (key) => {
    switch (key) {
      case 'music': return onMusicSeeAll
      case 'reading': return onReadingSeeAll
      case 'creation': return onViewCreationArchive
      default: return null
    }
  }

  // Render just the section component — no overlays, no wrapper
  const renderSectionContent = (key) => {
    switch (key) {
      case 'music':
        return (
          <MusicSection
            spotifyProfile={spotifyProfile}
            onSeeAll={onMusicSeeAll}
            isOwner={isOwner}
            onConnectSpotify={onConnectSpotify}
            onDisconnectSpotify={onDisconnectSpotify}
            connecting={spotifyConnecting}
            error={spotifyError}
          />
        )
      case 'reading':
        return (
          <ReadingSection
            books={books}
            readingThemes={readingThemes}
            readingGraph={readingGraph}
            onBookClick={onBookClick}
            onThemeClick={onThemeClick}
            onSeeAll={onReadingSeeAll}
            isOwner={isOwner}
            onAddBook={onAddBook}
            onImportGoodreads={onImportGoodreads}
            onScanBookshelf={onScanBookshelf}
          />
        )
      case 'experiences':
        return (
          <ExperiencesSection
            experiences={experiences}
            isOwner={isOwner}
            onExperienceClick={onExperienceClick}
            onAddExperience={onAddExperience}
            onScanPlaybill={onScanPlaybill}
          />
        )
      case 'creation':
        return (
          <CreationSection
            creations={creations}
            isOwner={isOwner}
            onAddCreationText={onAddCreationText}
            onAddCreationImage={onAddCreationImage}
            onViewArchive={onViewCreationArchive}
          />
        )
      default:
        return null
    }
  }

  // Render section content with owner overlays (arrow buttons, hide icon)
  const renderOwnerSection = (key, index) => {
    const isHidden = hiddenSections.includes(key)

    // Hidden: crease line + unhide icon
    if (isHidden) {
      return (
        <>
          <div style={{
            width: '100%',
            height: '4px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.06), transparent 40%, rgba(0,0,0,0.04))',
            borderRadius: '2px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '-1px',
              left: 0,
              right: 0,
              height: '1px',
              background: 'rgba(0,0,0,0.08)',
            }} />
          </div>
          <button
            type="button"
            onClick={() => onToggleHidden?.(key)}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              opacity: 0.7,
              lineHeight: 1,
              zIndex: 15,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            title={`Show ${key}`}
          >
            <EyeSlash size={16} weight="duotone" color="#622722" />
          </button>
        </>
      )
    }

    // Visible: arrow buttons + eye icon + section content
    return (
      <>
        {/* Reorder arrows — centered at top */}
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '4px',
          zIndex: 15,
        }}>
          {canMove(index, 'up') && (
            <ArrowButton direction="up" onClick={() => handleMove(index, 'up')} />
          )}
          {!isMobile && canMove(index, 'left') && (
            <ArrowButton direction="left" onClick={() => handleMove(index, 'left')} />
          )}
          {!isMobile && canMove(index, 'right') && (
            <ArrowButton direction="right" onClick={() => handleMove(index, 'right')} />
          )}
          {canMove(index, 'down') && (
            <ArrowButton direction="down" onClick={() => handleMove(index, 'down')} />
          )}
        </div>

        {/* "see all" link — bottom-left, same level as eye icon */}
        {getSeeAllHandler(key) && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); getSeeAllHandler(key)() }}
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#4A7BA7',
              padding: 0,
              fontStyle: 'italic',
              zIndex: 15,
            }}
          >
            see all
          </button>
        )}

        {/* Eye icon to hide — bottom-right */}
        {onToggleHidden && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleHidden(key) }}
            style={{
              position: 'absolute',
              bottom: '6px',
              right: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              opacity: 0.6,
              lineHeight: 1,
              zIndex: 15,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
            title={`Hide ${key}`}
          >
            <Eye size={14} weight="duotone" color="#622722" />
          </button>
        )}

        {/* Section content */}
        {renderSectionContent(key)}
      </>
    )
  }

  // Compute wrapper props for a section (className + style)
  const getSectionWrapperProps = (key, isHidden) => {
    const className = 'portrait-section-box'
    if (isHidden && isOwner) {
      return {
        className,
        style: {
          minHeight: 'unset',
          padding: 0,
          background: 'transparent',
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '28px',
          animation: 'none',
          transform: 'none',
        }
      }
    }
    return { className, style: {} }
  }

  // Filter sections for friend view rendering
  const visibleSections = gridOrder.filter(key => {
    if (!isOwner && hiddenSections.includes(key)) return false
    if (!isOwner && !sectionHasContent(key)) return false
    return sectionHasContent(key) || isOwner
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Welcome line — only when everything is empty */}
      {everythingEmpty && isOwner && (
        <p style={{
          fontSize: '15px',
          color: '#999',
          fontStyle: 'italic',
          lineHeight: 1.6,
          margin: '0 0 4px 0',
        }}>
          Connect Spotify or photograph your bookshelf to begin shaping your portrait.
        </p>
      )}

      {/* Portrait Card — full width, dark hero, NOT reorderable */}
      {showPortraitCard && (
        <PortraitCard
          spotifyProfile={spotifyProfile}
          books={books}
          onImageClick={onPortraitImageClick}
          isOwner={isOwner}
        />
      )}

      {/* Sections — .grid class (2-col desktop, 1-col mobile) */}
      {visibleSections.length > 0 && (
        isOwner && onSectionOrderChange ? (
          <LayoutGroup>
            <div className="grid">
              {gridOrder.map((key, index) => {
                const isHidden = hiddenSections.includes(key)
                const wrapperProps = getSectionWrapperProps(key, isHidden)
                return (
                  <motion.div
                    key={key}
                    layout
                    transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                    className={wrapperProps.className}
                    style={{ ...wrapperProps.style, cursor: isHidden ? 'default' : 'grab' }}
                    drag={!isHidden}
                    dragSnapToOrigin
                    dragElastic={0.15}
                    dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    onDragEnd={handleDragEnd(index)}
                    whileDrag={{ scale: 1.02, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}
                  >
                    {renderOwnerSection(key, index)}
                  </motion.div>
                )
              })}
            </div>
          </LayoutGroup>
        ) : (
          <div className="grid">
            {visibleSections.map(key => {
              const wrapperProps = getSectionWrapperProps(key, false)
              return (
                <div key={key} className={wrapperProps.className} style={{ ...wrapperProps.style, position: 'relative' }}>
                  {getSeeAllHandler(key) && (
                    <button
                      type="button"
                      onClick={() => getSeeAllHandler(key)()}
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#4A7BA7',
                        padding: 0,
                        fontStyle: 'italic',
                        zIndex: 15,
                      }}
                    >
                      see all
                    </button>
                  )}
                  {renderSectionContent(key)}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
