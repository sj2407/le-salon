import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { PlaybillScanModal } from '../components/portrait/PlaybillScanModal'
import { CoverSearchModal } from '../components/cover-search/CoverSearchModal'

/**
 * Portrait tab page — fetches live data, manages all interactions.
 * Friend view: accepts userId prop, read-only.
 */
export const Portrait = ({ userId: friendUserId }) => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isOwner = !friendUserId
  const targetUserId = friendUserId || profile?.id

  // Data state
  const [spotifyProfile, setSpotifyProfile] = useState(null)
  const [books, setBooks] = useState([])
  const [readingThemes, setReadingThemes] = useState(null)
  const [readingGraph, setReadingGraph] = useState(null)
  const [creations, setCreations] = useState([])
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [spotifyConnecting, setSpotifyConnecting] = useState(false)
  const [spotifyError, setSpotifyError] = useState(null)

  // Portrait section preferences (local state for optimistic updates)
  const [portraitHidden, setPortraitHidden] = useState(profile?.portrait_hidden_sections || [])
  const [portraitOrder, setPortraitOrder] = useState(profile?.portrait_section_order || [])

  // Modal state
  const [showMusicModal, setShowMusicModal] = useState(false)
  const [showReadingModal, setShowReadingModal] = useState(false)
  const [showCreationArchive, setShowCreationArchive] = useState(false)
  const [showAddCreation, setShowAddCreation] = useState(false)
  const [showAddExperience, setShowAddExperience] = useState(false)
  const [showAddBook, setShowAddBook] = useState(false)
  const [showGoodreadsImport, setShowGoodreadsImport] = useState(false)
  const [showBookshelfScan, setShowBookshelfScan] = useState(false)
  const [showPlaybillScan, setShowPlaybillScan] = useState(false)
  const [addCreationMode, setAddCreationMode] = useState(null)
  const [editingCreation, setEditingCreation] = useState(null)
  const [selectedExperience, setSelectedExperience] = useState(null)
  const [selectedBook, setSelectedBook] = useState(null)
  const [bookPopoverRect, setBookPopoverRect] = useState(null)
  const [coverSearchBook, setCoverSearchBook] = useState(null) // book being cover-searched

  // --- Helper: call an Edge Function with auth ---
  const callEdgeFunction = async (name, body = {}) => {
    // Force a session refresh to get a fresh JWT (critical after full-page redirects like Spotify OAuth)
    let { data: { session } } = await supabase.auth.refreshSession()
    if (!session) {
      // Fallback: try stored session
      const stored = await supabase.auth.getSession()
      session = stored.data?.session
    }
    if (!session) {
      throw new Error('Not authenticated — please sign in again')
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `${name} failed (${res.status})`)
    }
    return res.json()
  }

  // --- Generation triggers (fire-and-forget, non-blocking) ---

  const triggerReadingThemes = async (userIdParam) => {
    try {
      const uid = userIdParam || targetUserId
      const result = await callEdgeFunction('reading-themes', { user_id: uid })
      if (result.themes) {
        setReadingThemes(result.themes)
      }
      if (result.reading_graph) {
        setReadingGraph(result.reading_graph)
      }
    } catch (err) {
      console.warn('Reading themes generation:', err.message)
    }
  }

  const triggerCoverEnrichment = async (userId) => {
    try {
      await callEdgeFunction('book-enrich-batch', { user_id: userId, enrich_genres: true })
      // Refresh books to show new covers and genres
      const { data } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .order('date_read', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (data) setBooks(data)
    } catch (err) {
      console.warn('Cover enrichment:', err.message)
    }
  }

  const triggerPortraitGeneration = async () => {
    try {
      const result = await callEdgeFunction('portrait-generate', { user_id: targetUserId })
      if (result.portrait_text) {
        setSpotifyProfile(prev => prev ? {
          ...prev,
          portrait_text: result.portrait_text,
          mood_label: result.mood_label || prev.mood_label,
          mood_line: result.mood_line || prev.mood_line,
        } : prev)
      }
    } catch (err) {
      console.warn('Portrait generation:', err.message)
    }
  }

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
      // Exchange code for tokens
      await callEdgeFunction('spotify-auth', {
        action: 'callback',
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      })

      // Sync Spotify data
      await callEdgeFunction('spotify-sync', {})

      // Refresh data
      await fetchAllData()

      // Generate portrait prose (fire-and-forget — updates state when ready)
      triggerPortraitGeneration()
    } catch (err) {
      console.error('Spotify connection error:', err)
      setSpotifyError('Failed to connect Spotify: ' + err.message)
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
          .order('date_read', { ascending: false, nullsFirst: false })
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

      const fetchedBooks = booksResult.data && !booksResult.error ? booksResult.data : []
      setSpotifyProfile(spotifyResult.data && !spotifyResult.error ? spotifyResult.data : null)
      setBooks(fetchedBooks)
      setCreations(creationsResult.data && !creationsResult.error ? creationsResult.data : [])
      setExperiences(experiencesResult.data && !experiencesResult.error ? experiencesResult.data : [])

      // Reading themes from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('reading_themes, reading_graph')
        .eq('id', targetUserId)
        .single()
      const themes = profileData?.reading_themes || null
      setReadingThemes(themes)
      setReadingGraph(profileData?.reading_graph || null)

      // Enrich missing covers/genres (owner only)
      if (isOwner && fetchedBooks.length >= 1) {
        if (fetchedBooks.some(b => !b.cover_url || !b.goodreads_genres)) {
          triggerCoverEnrichment(targetUserId)
        }
      }

      // Generate reading themes if user has books — works for owner AND friend view
      // (populates on first visit so portraits aren't blank)
      if (fetchedBooks.length >= 1) {
        triggerReadingThemes(targetUserId)
      }

      // Auto-generate portrait prose if data exists but prose is missing or stale (owner only)
      const sp = spotifyResult.data && !spotifyResult.error ? spotifyResult.data : null
      const hasAnyData = sp?.is_active || fetchedBooks.length > 0 ||
        (experiencesResult.data?.length > 0) || (creationsResult.data?.length > 0)
      const isPortraitStale = sp?.portrait_generated_at &&
        (Date.now() - new Date(sp.portrait_generated_at).getTime()) > 30 * 24 * 3600 * 1000
      if (isOwner && hasAnyData && (!sp?.portrait_text || isPortraitStale)) {
        triggerPortraitGeneration()
      }
    } catch (_err) {
      // Leave empty state — user starts from scratch
    } finally {
      setLoading(false)
    }
  }

  // --- Spotify connect/disconnect ---

  const handleConnectSpotify = async () => {
    setSpotifyError(null) // Clear previous error before retrying
    const result = await startSpotifyConnect()
    if (result?.ok === false) {
      setSpotifyError('Spotify is not configured yet. Ask the admin to add the Spotify Client ID.')
    }
  }

  const handleDisconnectSpotify = async () => {
    try {
      await callEdgeFunction('spotify-auth', { action: 'disconnect' })
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

  const handleAddCreationText = () => { setEditingCreation(null); setAddCreationMode('text'); setShowAddCreation(true) }
  const handleAddCreationImage = () => { setEditingCreation(null); setAddCreationMode('image'); setShowAddCreation(true) }
  const handleEditCreation = (creation) => { setEditingCreation(creation); setAddCreationMode(null); setShowAddCreation(true) }
  const handleViewCreationArchive = () => setShowCreationArchive(true)
  const handleAddExperience = () => setShowAddExperience(true)
  const handleScanPlaybill = () => setShowPlaybillScan(true)
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

  const handleCreationUpdated = (updatedCreation) => {
    setCreations(prev =>
      prev.map(c => c.id === updatedCreation.id ? updatedCreation : c)
    )
  }

  const handleExperienceCreated = (newExperience) => {
    setExperiences(prev => [newExperience, ...prev])
  }

  const handleBookCreated = (newBook) => {
    setBooks(prev => {
      const updated = [newBook, ...prev]
      // Fire-and-forget: enrich cover + genres, then regenerate themes
      triggerCoverEnrichment(targetUserId)
      triggerReadingThemes(targetUserId)
      return updated
    })
  }

  const handleBooksImported = () => {
    fetchAllData().then(() => {
      triggerCoverEnrichment(targetUserId)
      triggerReadingThemes(targetUserId)
    })
  }

  const handleBooksAdded = () => {
    fetchAllData().then(() => {
      triggerCoverEnrichment(targetUserId)
      triggerReadingThemes(targetUserId)
    })
  }

  // --- Portrait section preferences (drag + hide) ---

  const handleTogglePortraitHidden = async (sectionKey) => {
    if (!profile?.id) return
    const current = portraitHidden
    const next = current.includes(sectionKey)
      ? current.filter(s => s !== sectionKey)
      : [...current, sectionKey]

    setPortraitHidden(next)

    const { error } = await supabase
      .from('profiles')
      .update({ portrait_hidden_sections: next })
      .eq('id', profile.id)

    if (error) setPortraitHidden(current)
  }

  const handlePortraitSectionOrderChange = async (newOrder) => {
    if (!profile?.id) return
    const previous = portraitOrder

    setPortraitOrder(newOrder)

    const { error } = await supabase
      .from('profiles')
      .update({ portrait_section_order: newOrder })
      .eq('id', profile.id)

    if (error) setPortraitOrder(previous)
  }

  const handleExperiencesAdded = () => {
    supabase
      .from('experiences')
      .select('*')
      .eq('user_id', targetUserId)
      .order('date', { ascending: false })
      .then(({ data }) => { if (data) setExperiences(data) })
  }

  const handleChangeCover = (book) => {
    setSelectedBook(null)
    setBookPopoverRect(null)
    setCoverSearchBook(book)
  }

  const handleCoverSelected = async ({ imageUrl }) => {
    if (!coverSearchBook || !profile?.id || !imageUrl) return
    try {
      await supabase
        .from('books')
        .update({ cover_url: imageUrl })
        .eq('id', coverSearchBook.id)
        .eq('user_id', profile.id)

      // Update local state
      setBooks(prev => prev.map(b =>
        b.id === coverSearchBook.id ? { ...b, cover_url: imageUrl } : b
      ))
    } catch (err) {
      console.error('Error updating cover:', err)
    }
    setCoverSearchBook(null)
  }

  const handleViewReview = (reviewId) => {
    setSelectedBook(null)
    setBookPopoverRect(null)
    if (isOwner) {
      navigate(`/my-corner?tab=reviews&review=${reviewId}`)
    } else if (friendUserId) {
      navigate(`/friend/${friendUserId}?tab=reviews&review=${reviewId}`)
    }
  }

  if (loading) {
    return (
      <div className="loading" style={{ padding: '40px 0' }}>
        {spotifyConnecting ? 'Connecting Spotify...' : 'Loading portrait...'}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px', padding: '0 20px' }}>
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
          onAddCreationText={isOwner ? handleAddCreationText : undefined}
          onAddCreationImage={isOwner ? handleAddCreationImage : undefined}
          onDeleteCreation={isOwner ? handleDeleteCreation : undefined}
          onViewCreationArchive={handleViewCreationArchive}
          onAddExperience={isOwner ? handleAddExperience : undefined}
          onScanPlaybill={isOwner ? handleScanPlaybill : undefined}
          onPortraitImageClick={handlePortraitImageClick}
          onBookClick={handleBookClick}
          onThemeClick={handleThemeClick}
          onExperienceClick={handleExperienceClick}
          onMusicSeeAll={handleMusicSeeAll}
          onReadingSeeAll={handleReadingSeeAll}
          onConnectSpotify={isOwner ? handleConnectSpotify : undefined}
          onDisconnectSpotify={isOwner ? handleDisconnectSpotify : undefined}
          spotifyConnecting={spotifyConnecting}
          spotifyError={spotifyError}
          onAddBook={isOwner ? () => setShowAddBook(true) : undefined}
          onImportGoodreads={isOwner ? () => setShowGoodreadsImport(true) : undefined}
          onScanBookshelf={isOwner ? () => setShowBookshelfScan(true) : undefined}
          hiddenSections={portraitHidden}
          onToggleHidden={isOwner ? handleTogglePortraitHidden : undefined}
          sectionOrder={portraitOrder}
          onSectionOrderChange={isOwner ? handlePortraitSectionOrderChange : undefined}
        />
      </div>

      {/* Book popover */}
      {selectedBook && bookPopoverRect && (
        <BookPopover
          book={selectedBook}
          anchorRect={bookPopoverRect}
          onClose={() => { setSelectedBook(null); setBookPopoverRect(null) }}
          onViewReview={handleViewReview}
          isOwner={isOwner}
          onChangeCover={isOwner ? handleChangeCover : undefined}
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
        readingGraph={readingGraph}
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
        onEdit={isOwner ? handleEditCreation : undefined}
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
            onClose={() => { setShowAddCreation(false); setAddCreationMode(null); setEditingCreation(null) }}
            onCreated={handleCreationCreated}
            onUpdated={handleCreationUpdated}
            initialMode={addCreationMode}
            editCreation={editingCreation}
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
          <PlaybillScanModal
            isOpen={showPlaybillScan}
            onClose={() => setShowPlaybillScan(false)}
            onExperiencesAdded={handleExperiencesAdded}
          />
          <CoverSearchModal
            isOpen={!!coverSearchBook}
            onClose={() => setCoverSearchBook(null)}
            onSelect={handleCoverSelected}
            initialQuery={[coverSearchBook?.title, coverSearchBook?.author].filter(Boolean).join(' ') || ''}
            mediaType="book"
          />
        </>
      )}
    </div>
  )
}
