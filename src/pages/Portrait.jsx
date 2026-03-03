import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { startSpotifyConnect, getSpotifyCallbackCode } from '../lib/spotifyAuth'
import { PortraitDisplay } from '../components/portrait/PortraitDisplay'
import { BookPopover } from '../components/portrait/BookPopover'
import { MusicDetailModal } from '../components/portrait/MusicDetailModal'
import { ReadingDetailModal } from '../components/portrait/ReadingDetailModal'
import { CreationArchiveModal } from '../components/portrait/CreationArchiveModal'
import { ExperienceDetailModal } from '../components/portrait/ExperienceDetailModal'
import { AddCreationModal } from '../components/portrait/AddCreationModal'
import { AddExperienceModal } from '../components/portrait/AddExperienceModal'
import { AddBookModal } from '../components/portrait/AddBookModal'
import { GoodreadsImportModal } from '../components/portrait/GoodreadsImportModal'
import { BookshelfScanModal } from '../components/portrait/BookshelfScanModal'

/**
 * Portrait tab page — fetches live data, manages all interactions.
 * Friend view: accepts userId prop, read-only.
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
  const [spotifyConnecting, setSpotifyConnecting] = useState(false)

  // Modal state
  const [showMusicModal, setShowMusicModal] = useState(false)
  const [showReadingModal, setShowReadingModal] = useState(false)
  const [showCreationArchive, setShowCreationArchive] = useState(false)
  const [showAddCreation, setShowAddCreation] = useState(false)
  const [showAddExperience, setShowAddExperience] = useState(false)
  const [showAddBook, setShowAddBook] = useState(false)
  const [showGoodreadsImport, setShowGoodreadsImport] = useState(false)
  const [showBookshelfScan, setShowBookshelfScan] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState(null)
  const [selectedBook, setSelectedBook] = useState(null)
  const [bookPopoverRect, setBookPopoverRect] = useState(null)

  // --- Spotify OAuth callback handling ---
  useEffect(() => {
    const callback = getSpotifyCallbackCode()
    if (callback && isOwner) {
      handleSpotifyCallback(callback)
    }
  }, [])

  useEffect(() => {
    if (targetUserId) {
      fetchAllData()
    }
  }, [targetUserId])

  const handleSpotifyCallback = async ({ code, codeVerifier, redirectUri }) => {
    setSpotifyConnecting(true)
    try {
      const { data: session } = await supabase.auth.getSession()

      // Exchange code for tokens via Edge Function
      const authRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spotify-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            action: 'callback',
            code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri,
          }),
        }
      )

      if (!authRes.ok) {
        const err = await authRes.json()
        throw new Error(err.error || 'Spotify auth failed')
      }

      // Now sync Spotify data
      const syncRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spotify-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      )

      if (!syncRes.ok) {
        const err = await syncRes.json()
        throw new Error(err.error || 'Spotify sync failed')
      }

      // Refresh data
      await fetchAllData()
    } catch (err) {
      console.error('Spotify connection error:', err)
      alert('Failed to connect Spotify: ' + err.message)
    } finally {
      setSpotifyConnecting(false)
    }
  }

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

      setSpotifyProfile(spotifyResult.data && !spotifyResult.error ? spotifyResult.data : null)
      setBooks(booksResult.data && !booksResult.error ? booksResult.data : [])
      setCreations(creationsResult.data && !creationsResult.error ? creationsResult.data : [])
      setExperiences(experiencesResult.data && !experiencesResult.error ? experiencesResult.data : [])

      // Reading themes from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('reading_themes')
        .eq('id', targetUserId)
        .single()
      setReadingThemes(profileData?.reading_themes || null)
    } catch (_err) {
      // Leave empty state — user starts from scratch
    } finally {
      setLoading(false)
    }
  }

  // --- Spotify connect/disconnect ---

  const handleConnectSpotify = () => {
    startSpotifyConnect()
  }

  const handleDisconnectSpotify = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spotify-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action: 'disconnect' }),
        }
      )
      if (!res.ok) throw new Error('Disconnect failed')
      setSpotifyProfile(null)
    } catch (err) {
      console.error('Spotify disconnect error:', err)
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

  const handleThemeClick = () => setShowReadingModal(true)
  const handleExperienceClick = (exp) => setSelectedExperience(exp)

  // --- Item created callbacks ---

  const handleCreationCreated = (newCreation) => {
    setCreations(prev => [newCreation, ...prev])
  }

  const handleExperienceCreated = (newExperience) => {
    setExperiences(prev => [newExperience, ...prev])
  }

  const handleBookCreated = (newBook) => {
    setBooks(prev => [newBook, ...prev])
  }

  const handleBooksImported = () => {
    // Re-fetch books after import
    fetchAllData()
  }

  const handleBooksAdded = () => {
    fetchAllData()
  }

  if (loading) {
    return (
      <div className="loading" style={{ padding: '40px 0' }}>
        {spotifyConnecting ? 'Connecting Spotify...' : 'Loading portrait...'}
      </div>
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
          onConnectSpotify={isOwner ? handleConnectSpotify : undefined}
          onDisconnectSpotify={isOwner ? handleDisconnectSpotify : undefined}
          onAddBook={isOwner ? () => setShowAddBook(true) : undefined}
          onImportGoodreads={isOwner ? () => setShowGoodreadsImport(true) : undefined}
          onScanBookshelf={isOwner ? () => setShowBookshelfScan(true) : undefined}
        />
      </div>

      {/* Book popover */}
      {selectedBook && bookPopoverRect && (
        <BookPopover
          book={selectedBook}
          anchorRect={bookPopoverRect}
          onClose={() => { setSelectedBook(null); setBookPopoverRect(null) }}
        />
      )}

      {/* Detail modals */}
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

      {/* Owner-only add/import modals */}
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
          <AddBookModal
            isOpen={showAddBook}
            onClose={() => setShowAddBook(false)}
            onCreated={handleBookCreated}
          />
          <GoodreadsImportModal
            isOpen={showGoodreadsImport}
            onClose={() => setShowGoodreadsImport(false)}
            onImported={handleBooksImported}
          />
          <BookshelfScanModal
            isOpen={showBookshelfScan}
            onClose={() => setShowBookshelfScan(false)}
            onBooksAdded={handleBooksAdded}
          />
        </>
      )}
    </div>
  )
}
