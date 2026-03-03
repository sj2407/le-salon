import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PortraitDisplay } from '../components/portrait/PortraitDisplay'
import {
  MOCK_SPOTIFY_PROFILE,
  MOCK_BOOKS,
  MOCK_READING_THEMES,
  MOCK_EXPERIENCES,
  MOCK_CREATIONS,
} from '../components/portrait/mockData'

/**
 * Portrait tab page — fetches data and renders PortraitDisplay.
 *
 * For v1 (mock data development): uses mock data as fallback when no live data.
 * For friend view: accepts a userId prop and fetches that user's data (read-only).
 */
export const Portrait = ({ userId: friendUserId }) => {
  const { profile } = useAuth()
  const isOwner = !friendUserId
  const targetUserId = friendUserId || profile?.id

  const [spotifyProfile, setSpotifyProfile] = useState(null)
  const [books, setBooks] = useState([])
  const [readingThemes, setReadingThemes] = useState(null)
  const [creations, setCreations] = useState([])
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)

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

  const handleAddCreation = () => {
    // TODO: Open creation modal (worktree-4 builds the modal)
  }

  const handleDeleteCreation = async (creationId) => {
    if (!confirm('Delete this creation?')) return

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

  const handleViewCreationArchive = () => {
    // TODO: Open archive modal (worktree-4 builds the modal)
  }

  const handleAddExperience = () => {
    // TODO: Open experience form modal (worktree-4 builds the modal)
  }

  // --- Navigation callbacks ---

  const handlePortraitImageClick = (img) => {
    // TODO: Navigate to source (worktree-4 builds navigation)
  }

  const handleBookClick = (book) => {
    // TODO: Open book popover (worktree-4 builds the popover)
  }

  const handleThemeClick = (theme) => {
    // TODO: Filter by theme (worktree-4 builds filter mechanic)
  }

  const handleExperienceClick = (experience) => {
    // TODO: Open experience detail modal (worktree-4 builds the modal)
  }

  const handleMusicSeeAll = () => {
    // TODO: Open music detail modal (worktree-4 builds the modal)
  }

  const handleReadingSeeAll = () => {
    // TODO: Open reading detail modal (worktree-4 builds the modal)
  }

  if (loading) {
    return (
      <div className="loading" style={{ padding: '40px 0' }}>Loading portrait...</div>
    )
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '0', marginTop: '8px', marginLeft: '10px', position: 'relative', zIndex: 1, transform: 'translateY(16px)' }}>
        {isOwner ? 'Portrait' : 'Portrait'}
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
    </div>
  )
}
