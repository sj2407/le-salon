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
import { ExperienceArchiveModal } from '../components/portrait/ExperienceArchiveModal'
import { ExperienceThemesModal } from '../components/portrait/ExperienceThemesModal'
import { ViewingArchiveModal } from '../components/portrait/ViewingArchiveModal'
import { ViewingDetailModal } from '../components/portrait/ViewingDetailModal'
import { AddCreationModal } from '../components/portrait/AddCreationModal'
import { AddExperienceModal } from '../components/portrait/AddExperienceModal'
import { AddViewingModal } from '../components/portrait/AddViewingModal'
import { AddBookModal } from '../components/portrait/AddBookModal'
import { GoodreadsImportModal } from '../components/portrait/GoodreadsImportModal'
import { BookshelfScanModal } from '../components/portrait/BookshelfScanModal'
import { PlaybillScanModal } from '../components/portrait/PlaybillScanModal'
import { CoverSearchModal } from '../components/cover-search/CoverSearchModal'
import { ConfirmModal } from '../components/ConfirmModal'

// Module-level cache — survives unmount, instant render on return
let _portraitCache = null // { userId, spotifyProfile, books, readingThemes, readingGraph, creations, experiences }

/**
 * Portrait tab page — fetches live data, manages all interactions.
 * Friend view: accepts userId prop, read-only.
 */
export const Portrait = ({ userId: friendUserId, friendName }) => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isOwner = !friendUserId
  const targetUserId = friendUserId || profile?.id

  const _cached = _portraitCache?.userId === targetUserId ? _portraitCache : null

  // Data state
  const [spotifyProfile, setSpotifyProfile] = useState(_cached?.spotifyProfile || null)
  const [books, setBooks] = useState(_cached?.books || [])
  const [readingThemes, setReadingThemes] = useState(_cached?.readingThemes || null)
  const [readingGraph, setReadingGraph] = useState(_cached?.readingGraph || null)
  const [experienceThemes, setExperienceThemes] = useState(_cached?.experienceThemes || null)
  const [experienceGraph, setExperienceGraph] = useState(_cached?.experienceGraph || null)
  const [creations, setCreations] = useState(_cached?.creations || [])
  const [experiences, setExperiences] = useState(_cached?.experiences || [])
  const [viewing, setViewing] = useState(_cached?.viewing || [])
  const [loading, setLoading] = useState(!_cached)
  const [spotifyConnecting, setSpotifyConnecting] = useState(false)
  const [spotifyError, setSpotifyError] = useState(null)

  // Portrait section preferences (local state for optimistic updates)
  const [portraitHidden, setPortraitHidden] = useState(profile?.portrait_hidden_sections || [])
  const [portraitOrder, setPortraitOrder] = useState(profile?.portrait_section_order || [])

  // Modal state
  const [showMusicModal, setShowMusicModal] = useState(false)
  const [showReadingModal, setShowReadingModal] = useState(false)
  const [showCreationArchive, setShowCreationArchive] = useState(false)
  const [showExperienceArchive, setShowExperienceArchive] = useState(false)
  const [showExperienceThemes, setShowExperienceThemes] = useState(false)
  const [showViewingArchive, setShowViewingArchive] = useState(false)
  const [showAddCreation, setShowAddCreation] = useState(false)
  const [showAddExperience, setShowAddExperience] = useState(false)
  const [showAddViewing, setShowAddViewing] = useState(false)
  const [showAddBook, setShowAddBook] = useState(false)
  const [showGoodreadsImport, setShowGoodreadsImport] = useState(false)
  const [showBookshelfScan, setShowBookshelfScan] = useState(false)
  const [showPlaybillScan, setShowPlaybillScan] = useState(false)
  const [addCreationMode, setAddCreationMode] = useState(null)
  const [editingCreation, setEditingCreation] = useState(null)
  const [selectedExperience, setSelectedExperience] = useState(null)
  const [editingSelectedExperience, setEditingSelectedExperience] = useState(false)
  const [selectedViewing, setSelectedViewing] = useState(null)
  const [editingSelectedViewing, setEditingSelectedViewing] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const [bookPopoverRect, setBookPopoverRect] = useState(null)
  const [coverSearchBook, setCoverSearchBook] = useState(null) // book being cover-searched
  const [confirmState, setConfirmState] = useState(null)

  // --- Helper: call an Edge Function with auth ---
  const callEdgeFunction = async (name, body = {}) => {
    // Use cached session first, refresh only if missing/expired
    let { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const refreshed = await supabase.auth.refreshSession()
      session = refreshed.data?.session
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

  const triggerExperienceThemes = async () => {
    try {
      const result = await callEdgeFunction('experience-themes', {})
      if (result.themes) setExperienceThemes(result.themes)
      if (result.experience_graph) setExperienceGraph(result.experience_graph)
    } catch (err) {
      console.warn('Experience themes generation:', err.message)
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

  // Look up an existing TMDB cover for a (title, type) by checking the user's
  // reviews and discovery_items (la liste). Both already store TMDB cover URLs
  // when items were added through their respective flows.
  // Returns image_url string or null.
  const lookupLocalCover = async (title, type) => {
    if (!title || !type) return null
    const tag = type === 'tv' ? 'show' : 'movie'
    const t = title.trim().toLowerCase()
    try {
      const [{ data: rev }, { data: disc }] = await Promise.all([
        supabase
          .from('reviews')
          .select('image_url, title, tag')
          .eq('user_id', targetUserId)
          .eq('tag', tag)
          .not('image_url', 'is', null)
          .limit(50),
        supabase
          .from('discovery_items')
          .select('image_url, title, tag')
          .eq('user_id', targetUserId)
          .eq('tag', tag)
          .not('image_url', 'is', null)
          .limit(50),
      ])
      const candidates = [...(rev || []), ...(disc || [])]
      const hit = candidates.find(c => c.title && c.title.trim().toLowerCase() === t)
      return hit?.image_url || null
    } catch {
      return null
    }
  }

  // Pull card 'Watching' entries into the viewing table.
  // One-shot per entry (tracked via entries.card_synced_at). Owner only.
  // Dedup against existing viewing rows via the unique index on (user_id, lower(title), type).
  const syncCardWatchingToViewing = async () => {
    try {
      // 1. Find the user's current card
      const { data: cardData } = await supabase
        .from('cards')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('is_current', true)
        .single()
      if (!cardData) return

      // 2. Watching entries that haven't been synced yet
      const { data: entries } = await supabase
        .from('entries')
        .select('id, content, subcategory, created_at')
        .eq('card_id', cardData.id)
        .eq('category', 'Watching')
        .in('subcategory', ['tv', 'movie'])
        .is('card_synced_at', null)
      if (!entries || entries.length === 0) return

      const valid = entries.filter(e => e.content && e.content.trim().length > 0)
      if (valid.length === 0) return

      // 3. Look up local covers for each entry before inserting (reviews / discovery_items).
      //    This avoids a TMDB roundtrip when we already have the cover stored elsewhere.
      //    date_watched defaults to the entry's creation date — best proxy we have for
      //    "when the user added this to their card." Drives the monthly portrait slice.
      const rowsToInsert = await Promise.all(valid.map(async (e) => {
        const localCover = await lookupLocalCover(e.content.trim(), e.subcategory)
        return {
          user_id: targetUserId,
          title: e.content.trim(),
          type: e.subcategory,
          source: 'card',
          status: 'watching',
          cover_url: localCover,
          date_watched: e.created_at ? e.created_at.slice(0, 10) : null,
        }
      }))

      const { data: inserted } = await supabase
        .from('viewing')
        .upsert(rowsToInsert, { onConflict: 'user_id,title,type', ignoreDuplicates: true })
        .select()

      // 4. Mark all entries as synced regardless of insert outcome — we've "seen" them
      const entryIds = valid.map(e => e.id)
      await supabase
        .from('entries')
        .update({ card_synced_at: new Date().toISOString() })
        .in('id', entryIds)

      // 5. Fire enrichment for newly inserted rows (fire-and-forget)
      if (inserted && inserted.length > 0) {
        for (const row of inserted) {
          // Stagger calls slightly to be polite to TMDB rate limits
          enrichViewingRow(row).catch(() => {})
        }
        // Refresh viewing list so the new rows show up
        const { data: refreshedViewing } = await supabase
          .from('viewing')
          .select('*')
          .eq('user_id', targetUserId)
          .order('date_watched', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
        if (refreshedViewing) {
          setViewing(refreshedViewing)
          if (_portraitCache?.userId === targetUserId) {
            _portraitCache.viewing = refreshedViewing
          }
        }
      }
    } catch (err) {
      console.warn('syncCardWatchingToViewing:', err.message)
    }
  }

  // Helper: enrich a single viewing row via TMDB and persist the result.
  // Sets enrichment_attempted_at in all exit paths.
  const enrichViewingRow = async (row) => {
    const fields = { enrichment_attempted_at: new Date().toISOString() }
    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/viewing-enrich`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ title: row.title, type: row.type }),
        }
      )
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          fields.tmdb_id = result.tmdb_id
          fields.tmdb_overview = result.tmdb_overview
          fields.tmdb_release_year = result.tmdb_release_year
          // Only overwrite cover_url if TMDB returned one — preserve existing
          // local cover (from reviews/discovery_items) if TMDB had nothing.
          if (result.cover_url) fields.cover_url = result.cover_url
        }
      }
    } catch { /* swallow */ }

    // If we still don't have a cover (no TMDB result and the row had no cover yet),
    // try the local lookup as a final fallback.
    if (!fields.cover_url && !row.cover_url) {
      const localCover = await lookupLocalCover(row.title, row.type)
      if (localCover) fields.cover_url = localCover
    }

    const { data: updated } = await supabase
      .from('viewing')
      .update(fields)
      .eq('id', row.id)
      .select()
      .single()

    if (updated) {
      setViewing(prev => prev.map(v => v.id === updated.id ? updated : v))
      if (_portraitCache?.userId === targetUserId) {
        _portraitCache.viewing = _portraitCache.viewing.map(v => v.id === updated.id ? updated : v)
      }
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
      const hadCache = _portraitCache?.userId === targetUserId
      if (!hadCache) setLoading(true)

      const [spotifyResult, booksResult, creationsResult, experiencesResult, viewingResult, profileResult] = await Promise.all([
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
        supabase
          .from('viewing')
          .select('*')
          .eq('user_id', targetUserId)
          .order('date_watched', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('reading_themes, reading_graph, experience_themes, experience_graph')
          .eq('id', targetUserId)
          .single(),
      ])

      const sp = spotifyResult.data && !spotifyResult.error ? spotifyResult.data : null
      const fetchedBooks = booksResult.data && !booksResult.error ? booksResult.data : []
      const fetchedCreations = creationsResult.data && !creationsResult.error ? creationsResult.data : []
      const fetchedExperiences = experiencesResult.data && !experiencesResult.error ? experiencesResult.data : []
      const fetchedViewing = viewingResult.data && !viewingResult.error ? viewingResult.data : []
      const themes = profileResult.data?.reading_themes || null
      const graph = profileResult.data?.reading_graph || null
      const expThemes = profileResult.data?.experience_themes || null
      const expGraph = profileResult.data?.experience_graph || null

      setSpotifyProfile(sp)
      setBooks(fetchedBooks)
      setCreations(fetchedCreations)
      setExperiences(fetchedExperiences)
      setViewing(fetchedViewing)
      setReadingThemes(themes)
      setReadingGraph(graph)
      setExperienceThemes(expThemes)
      setExperienceGraph(expGraph)

      // Update cache
      _portraitCache = {
        userId: targetUserId,
        spotifyProfile: sp,
        books: fetchedBooks,
        readingThemes: themes,
        readingGraph: graph,
        experienceThemes: expThemes,
        experienceGraph: expGraph,
        creations: fetchedCreations,
        experiences: fetchedExperiences,
        viewing: fetchedViewing,
      }

      // Sync + enrich viewing rows runs on every load (idempotent — gated by
      // entries.card_synced_at and viewing.enrichment_attempted_at).
      if (isOwner) {
        syncCardWatchingToViewing()
      }
      if (isOwner && fetchedViewing.length > 0) {
        const pending = fetchedViewing.filter(v => !v.tmdb_overview && !v.enrichment_attempted_at)
        for (const row of pending) {
          enrichViewingRow(row).catch(() => {})
        }
      }

      // Only trigger heavier edge functions on first load (not cache-hit return visits)
      if (!hadCache) {
        // Enrich missing covers/genres (owner only)
        if (isOwner && fetchedBooks.length >= 1) {
          if (fetchedBooks.some(b => !b.cover_url || !b.goodreads_genres)) {
            triggerCoverEnrichment(targetUserId)
          }
        }

        // Generate reading themes (owner only — friend view uses saved data from fetchAllData)
        if (isOwner && fetchedBooks.length >= 1) {
          triggerReadingThemes(targetUserId)
        }

        // Generate experience themes (owner only) — function bails if <4 enriched rows
        if (isOwner && fetchedExperiences.filter(e => e.wikipedia_description).length >= 4) {
          triggerExperienceThemes()
        }

        // Auto-generate portrait prose if data exists but prose is missing or stale (owner only)
        const hasAnyData = sp?.is_active || fetchedBooks.length > 0 ||
          fetchedExperiences.length > 0 || fetchedCreations.length > 0
        const isPortraitStale = sp?.portrait_generated_at &&
          (Date.now() - new Date(sp.portrait_generated_at).getTime()) > 30 * 24 * 3600 * 1000
        if (isOwner && hasAnyData && (!sp?.portrait_text || isPortraitStale)) {
          triggerPortraitGeneration()
        }
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

  const handleDeleteCreation = (creationId) => {
    setConfirmState({
      message: 'Delete this creation?',
      onConfirm: async () => {
        await deleteCreation(creationId)
      }
    })
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
  const handleExperiencesSeeAll = () => setShowExperienceArchive(true)
  const handleExperienceThemesSeeAll = () => setShowExperienceThemes(true)
  const handleViewingSeeAll = () => setShowViewingArchive(true)

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
  const handleExperienceClick = (exp) => { setEditingSelectedExperience(false); setSelectedExperience(exp) }
  const handleEditExperience = (exp) => { setEditingSelectedExperience(true); setSelectedExperience(exp) }
  const handleDeleteExperience = (exp) => {
    setConfirmState({
      message: `Delete "${exp.name}" from your experiences?`,
      onConfirm: async () => {
        const { error } = await supabase.from('experiences').delete().eq('id', exp.id)
        if (error) return
        setExperiences(prev => prev.filter(e => e.id !== exp.id))
        if (selectedExperience?.id === exp.id) setSelectedExperience(null)
      },
    })
  }

  // Viewing handlers
  const handleAddViewing = () => setShowAddViewing(true)
  const handleViewingClick = (row) => { setEditingSelectedViewing(false); setSelectedViewing(row) }
  const handleEditViewing = (row) => { setEditingSelectedViewing(true); setSelectedViewing(row) }
  const handleDeleteViewing = (row) => {
    setConfirmState({
      message: `Delete "${row.title}" from your watching list?`,
      onConfirm: async () => {
        const { error } = await supabase.from('viewing').delete().eq('id', row.id)
        if (error) return
        setViewing(prev => prev.filter(v => v.id !== row.id))
        if (selectedViewing?.id === row.id) setSelectedViewing(null)
      },
    })
  }

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

  const handleViewingCreated = (newViewing) => {
    if (!newViewing) return
    setViewing(prev => [newViewing, ...prev])
  }

  const handleViewingUpdated = (updated) => {
    setViewing(prev => prev.map(v => v.id === updated.id ? updated : v))
    setSelectedViewing(updated)
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
        .update({ cover_url: imageUrl, cover_manual: true })
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
        {friendName ? `${friendName}'s Portrait` : 'Portrait'}
      </h1>

      <div style={{ marginTop: '28px' }}>
        <PortraitDisplay
          spotifyProfile={spotifyProfile}
          books={books}
          readingThemes={readingThemes}
          readingGraph={readingGraph}
          creations={creations}
          experiences={experiences}
          experienceThemes={experienceThemes}
          experienceGraph={experienceGraph}
          viewing={viewing}
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
          onEditExperience={isOwner ? handleEditExperience : undefined}
          onDeleteExperience={isOwner ? handleDeleteExperience : undefined}
          onAddViewing={isOwner ? handleAddViewing : undefined}
          onViewingClick={handleViewingClick}
          onEditViewing={isOwner ? handleEditViewing : undefined}
          onDeleteViewing={isOwner ? handleDeleteViewing : undefined}
          onViewingSeeAll={handleViewingSeeAll}
          onMusicSeeAll={handleMusicSeeAll}
          onReadingSeeAll={handleReadingSeeAll}
          onExperiencesSeeAll={handleExperiencesSeeAll}
          onExperienceThemesSeeAll={handleExperienceThemesSeeAll}
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

      <ExperienceArchiveModal
        isOpen={showExperienceArchive}
        onClose={() => setShowExperienceArchive(false)}
        experiences={experiences}
        isOwner={isOwner}
        onEditExperience={isOwner ? handleEditExperience : undefined}
        onDeleteExperience={isOwner ? handleDeleteExperience : undefined}
      />

      <ExperienceThemesModal
        isOpen={showExperienceThemes}
        onClose={() => setShowExperienceThemes(false)}
        experiences={experiences}
        experienceThemes={experienceThemes}
        experienceGraph={experienceGraph}
      />

      <ViewingArchiveModal
        isOpen={showViewingArchive}
        onClose={() => setShowViewingArchive(false)}
        viewing={viewing}
        isOwner={isOwner}
        onEditViewing={isOwner ? handleEditViewing : undefined}
        onDeleteViewing={isOwner ? handleDeleteViewing : undefined}
      />

      <ExperienceDetailModal
        isOpen={!!selectedExperience}
        onClose={() => { setSelectedExperience(null); setEditingSelectedExperience(false) }}
        experience={selectedExperience}
        startInEdit={editingSelectedExperience}
        isOwner={isOwner}
        onUpdated={(updated) => {
          setExperiences(prev => prev.map(e => e.id === updated.id ? updated : e))
          setSelectedExperience(updated)
        }}
      />

      <ViewingDetailModal
        isOpen={!!selectedViewing}
        onClose={() => { setSelectedViewing(null); setEditingSelectedViewing(false) }}
        viewing={selectedViewing}
        startInEdit={editingSelectedViewing}
        onUpdated={handleViewingUpdated}
        isOwner={isOwner}
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
          <AddViewingModal
            isOpen={showAddViewing}
            onClose={() => setShowAddViewing(false)}
            onCreated={handleViewingCreated}
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

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => { await confirmState?.onConfirm(); setConfirmState(null) }}
        title="Confirm"
        message={confirmState?.message || ''}
        confirmText="Delete"
        destructive
      />
    </div>
  )
}
