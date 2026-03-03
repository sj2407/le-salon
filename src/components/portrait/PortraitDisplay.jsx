import { PortraitCard } from './PortraitCard'
import { MusicSection } from './MusicSection'
import { ReadingSection } from './ReadingSection'
import { CreationSection } from './CreationSection'
import { ExperiencesSection } from './ExperiencesSection'

/**
 * Shared Portrait display component — defines the exact layout structure.
 * Used by both My Corner (Portrait.jsx) and Friend view (FriendCard.jsx).
 *
 * Layout order:
 * 1. Portrait Card (full width, dark hero)
 * 2. Creation (full width)
 * 3. Music + Reading (two-column grid, stacks on mobile)
 * 4. Experiences (full width, 3-column grid)
 *
 * NO className="container" — the parent provides it.
 */
export const PortraitDisplay = ({
  spotifyProfile,
  books,
  readingThemes,
  creations,
  experiences,
  isOwner,
  // Action callbacks (owner view only)
  onToggleCreationVisibility,
  onAddCreation,
  onDeleteCreation,
  onViewCreationArchive,
  onAddExperience,
  // Navigation callbacks
  onPortraitImageClick,
  onBookClick,
  onThemeClick,
  onExperienceClick,
  onMusicSeeAll,
  onReadingSeeAll,
}) => {
  const hasSpotify = spotifyProfile && spotifyProfile.is_active
  const hasBooks = books && books.length > 0
  const hasCreations = creations && creations.length > 0
  const hasExperiences = experiences && experiences.length > 0

  // Everything empty — full-page prompt for owner
  const everythingEmpty = !hasSpotify && !hasBooks && !hasCreations && !hasExperiences

  if (everythingEmpty && !isOwner) {
    return null
  }

  if (everythingEmpty && isOwner) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
      }}>
        <p style={{
          fontSize: '42px',
          marginBottom: '12px',
          lineHeight: 1,
        }}>
          {'\u2728'}
        </p>
        <h2 className="handwritten" style={{
          fontSize: '28px',
          marginBottom: '8px',
          color: '#2C2C2C',
        }}>
          Your Portrait
        </h2>
        <p style={{
          fontSize: '15px',
          color: '#777',
          fontStyle: 'italic',
          lineHeight: 1.6,
          maxWidth: '340px',
          margin: '0 auto',
        }}>
          Connect Spotify or photograph your bookshelf to begin shaping your cultural identity.
        </p>
      </div>
    )
  }

  // Show/hide portrait card based on data
  const showPortraitCard = hasSpotify && spotifyProfile?.mood_label

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Portrait Card — full width, dark hero */}
      {showPortraitCard && (
        <PortraitCard
          spotifyProfile={spotifyProfile}
          books={books}
          onImageClick={onPortraitImageClick}
          isOwner={isOwner}
        />
      )}

      {/* 2. Creation — full width */}
      <CreationSection
        creations={creations}
        isOwner={isOwner}
        onToggleVisibility={onToggleCreationVisibility}
        onAddCreation={onAddCreation}
        onViewArchive={onViewCreationArchive}
        onDelete={onDeleteCreation}
      />

      {/* 3. Music + Reading — two-column grid, stacks on mobile */}
      {(hasSpotify || hasBooks || isOwner) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          <MusicSection
            spotifyProfile={spotifyProfile}
            onSeeAll={onMusicSeeAll}
            isOwner={isOwner}
          />
          <ReadingSection
            books={books}
            readingThemes={readingThemes}
            onBookClick={onBookClick}
            onThemeClick={onThemeClick}
            onSeeAll={onReadingSeeAll}
            isOwner={isOwner}
          />
        </div>
      )}

      {/* 4. Experiences — full width, 3-column grid */}
      {(hasExperiences || isOwner) && (
        <ExperiencesSection
          experiences={experiences}
          isOwner={isOwner}
          onExperienceClick={onExperienceClick}
          onAddExperience={onAddExperience}
        />
      )}
    </div>
  )
}
