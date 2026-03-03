import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PortraitDisplay } from '../components/portrait/PortraitDisplay'
import { BookPopover } from '../components/portrait/BookPopover'
import { MusicDetailModal } from '../components/portrait/MusicDetailModal'
import { ReadingDetailModal } from '../components/portrait/ReadingDetailModal'
import { CreationArchiveModal } from '../components/portrait/CreationArchiveModal'
import { ExperienceDetailModal } from '../components/portrait/ExperienceDetailModal'
import { AddCreationModal } from '../components/portrait/AddCreationModal'
import { AddExperienceModal } from '../components/portrait/AddExperienceModal'
import {
  MOCK_SPOTIFY_PROFILE,
  MOCK_BOOKS,
  MOCK_READING_THEMES,
  MOCK_EXPERIENCES,
  MOCK_CREATIONS,
} from '../components/portrait/mockData'

/**
 * Portrait tab page — fetches data, manages modal state, renders PortraitDisplay.
 *
 * For v1 (mock data development): uses mock data as fallback when no live data.
 * For friend view: accepts a userId prop and fetches that user's data (read-only).
 */
export const Portrait = ({ userId: friendUserId }) => {
  const { profile } = useAuth()
  const isOwner = !friendUserId
  const targetUserId = friendUserId || profile?.id

  // Data state
  const [spotifyProfile, setSpotifyProfile] = useState(null)
  const [books, setBooks] = useState([])
  const [readingThemes, setReadingThemes] = useState(null)
  const [creations, setCreations] = useState([])
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showMusicModal, setShowMusicModal] = useState(false)
  const [showReadingModal, setShowReadingModal] = useState(false)
  const [showCreationArchive, setShowCreationArchive] = useState(false)
  const [showAddCreation, setShowAddCreation] = useState(false)
  const [showAddExperience, setShowAddExperience] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState(null)
  const [selectedBook, setSelectedBook] = useState(null)
  const [bookPopoverRect, setBookPopoverRect] = useState(null)

  useEffect(() => {
    if (targetUserId) {
      fetchAllData()
    }
  }, [targetUserId])

  const fetchAllData = async () => {
    try {
      setLoading(true)

      const [spotifyResult, booksResult, creationsResult, experiencesResult] = await Promise.all([
        supabase
          .from('spotify_profiles')
          .select('*')
          .eq('user_id', targetUserId)
          .single(),
        supabase
          .from('books')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false }),
        supabase
          .from('creations')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false }),
        supabase
          .from('experiences')
          .select('*')
          .eq('user_id', targetUserId)
          .order('date', { ascending: false }),
      ])

      // Spotify profile — fall back to mock if no live data
      if (spotifyResult.data && !spotifyResult.error) {
        setSpotifyProfile(spotifyResult.data)
      } else {
        setSpotifyProfile(isOwner ? MOCK_SPOTIFY_PROFILE : null)
      }

      // Books — fall back to mock if no live data
      if (booksResult.data && booksResult.data.length > 0 && !booksResult.error) {
        setBooks(booksResult.data)
      } else {
        setBooks(isOwner ? MOCK_BOOKS : [])
      }

      // Creations — fall back to mock if no live data
      if (creationsResult.data && creationsResult.data.length > 0 && !creationsResult.error) {
        setCreations(creationsResult.data)
      } else {
        setCreations(isOwner ? MOCK_CREATIONS : [])
      }

      // Experiences — fall back to mock if no live data
      if (experiencesResult.data && experiencesResult.data.length > 0 && !experiencesResult.error) {
        setExperiences(experiencesResult.data)
      } else {
        setExperiences(isOwner ? MOCK_EXPERIENCES : [])
      }

      // Reading themes — fetch from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('reading_themes')
        .eq('id', targetUserId)
        .single()
      if (profileData?.reading_themes) {
        setReadingThemes(profileData.reading_themes)
      } else {
        setReadingThemes(isOwner ? MOCK_READING_THEMES : null)
      }
    } catch (_err) {
      // Use mock data as fallback on error
      if (isOwner) {
        setSpotifyProfile(MOCK_SPOTIFY_PROFILE)
        setBooks(MOCK_BOOKS)
        setCreations(MOCK_CREATIONS)
        setExperiences(MOCK_EXPERIENCES)
        setReadingThemes(MOCK_READING_THEMES)
      }
    } finally {
      setLoading(false)
    }
  }

  // --- CRUD callbacks (owner only) ---

  const handleToggleCreationVisibility = async (creationId, isVisible) => {
    try {
      const { error } = await supabase
        .from('creations')
        .update({ is_visible: isVisible })
        .eq('id', creationId)
        .eq('user_id', profile.id)

      if (error) throw error

      setCreations(prev =>
        prev.map(c => c.id === creationId ? { ...c, is_visible: isVisible } : c)
      )
    } catch (_err) {
      // silently handled
    }
  }

  const deleteCreation = async (creationId) => {
    try {
      const { error } = await supabase
        .from('creations')
        .delete()
        .eq('id', creationId)
        .eq('user_id', profile.id)

      if (error) throw error

      setCreations(prev => prev.filter(c => c.id !== creationId))
    } catch (_err) {
      // silently handled
    }
  }

  // CreationSection overflow menu — adds its own confirm
  const handleDeleteCreation = async (creationId) => {
    if (!confirm('Delete this creation?')) return
    await deleteCreation(creationId)
  }

  // --- Modal open callbacks ---

  const handleAddCreation = () => setShowAddCreation(true)

  const handleViewCreationArchive = () => setShowCreationArchive(true)

  const handleAddExperience = () => setShowAddExperience(true)

  const handleMusicSeeAll = () => setShowMusicModal(true)

  const handleReadingSeeAll = () => setShowReadingModal(true)

  const handlePortraitImageClick = (img) => {
    if (img.type === 'artist') setShowMusicModal(true)
    else if (img.type === 'book') setShowReadingModal(true)
  }

  const handleBookClick = (book, e) => {
    if (e?.currentTarget) {
      setBookPopoverRect(e.currentTarget.getBoundingClientRect())
    }
    setSelectedBook(book)
  }

  const handleThemeClick = () => {
    setShowReadingModal(true)
  }

  const handleExperienceClick = (exp) => setSelectedExperience(exp)

  // --- Add callbacks ---

  const handleCreationCreated = (newCreation) => {
    setCreations(prev => [newCreation, ...prev])
  }

  const handleExperienceCreated = (newExperience) => {
    setExperiences(prev => [newExperience, ...prev])
  }

  if (loading) {
    return (
      <div className="loading" style={{ padding: '40px 0' }}>Loading portrait...</div>
    )
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '0', marginTop: '8px', marginLeft: '10px', position: 'relative', zIndex: 1, transform: 'translateY(16px)' }}>
        Portrait
      </h1>

      <div style={{ marginTop: '28px' }}>
        <PortraitDisplay
          spotifyProfile={spotifyProfile}
          books={books}
          readingThemes={readingThemes}
          creations={creations}
          experiences={experiences}
          isOwner={isOwner}
          onToggleCreationVisibility={isOwner ? handleToggleCreationVisibility : undefined}
          onAddCreation={isOwner ? handleAddCreation : undefined}
          onDeleteCreation={isOwner ? handleDeleteCreation : undefined}
          onViewCreationArchive={handleViewCreationArchive}
          onAddExperience={isOwner ? handleAddExperience : undefined}
          onPortraitImageClick={handlePortraitImageClick}
          onBookClick={handleBookClick}
          onThemeClick={handleThemeClick}
          onExperienceClick={handleExperienceClick}
          onMusicSeeAll={handleMusicSeeAll}
          onReadingSeeAll={handleReadingSeeAll}
        />
      </div>

      {/* Book popover — positioned near clicked cover */}
      {selectedBook && bookPopoverRect && (
        <BookPopover
          book={selectedBook}
          anchorRect={bookPopoverRect}
          onClose={() => { setSelectedBook(null); setBookPopoverRect(null) }}
        />
      )}

      {/* Modals */}
      <MusicDetailModal
        isOpen={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        spotifyProfile={spotifyProfile}
      />

      <ReadingDetailModal
        isOpen={showReadingModal}
        onClose={() => setShowReadingModal(false)}
        books={books}
        readingThemes={readingThemes}
        onBookClick={(book) => {
          setShowReadingModal(false)
          setSelectedBook(book)
        }}
      />

      <CreationArchiveModal
        isOpen={showCreationArchive}
        onClose={() => setShowCreationArchive(false)}
        creations={creations}
        isOwner={isOwner}
        onToggleVisibility={handleToggleCreationVisibility}
        onDelete={deleteCreation}
      />

      <ExperienceDetailModal
        isOpen={!!selectedExperience}
        onClose={() => setSelectedExperience(null)}
        experience={selectedExperience}
      />

      {isOwner && (
        <>
          <AddCreationModal
            isOpen={showAddCreation}
            onClose={() => setShowAddCreation(false)}
            onCreated={handleCreationCreated}
          />
          <AddExperienceModal
            isOpen={showAddExperience}
            onClose={() => setShowAddExperience(false)}
            onCreated={handleExperienceCreated}
          />
        </>
      )}
    </div>
  )
}
