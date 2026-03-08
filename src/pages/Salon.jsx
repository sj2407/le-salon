import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { ParlorText } from '../components/salon/ParlorText'
import { ParlorResponses } from '../components/salon/ParlorResponses'
import { CommonplaceBook } from '../components/salon/CommonplaceBook'
import { HistoricalTimeline } from '../components/salon/HistoricalTimeline'
import { CalligraphyTitle } from '../components/salon/CalligraphyTitle'
import { hapticTap } from '../lib/haptics'
import { Headphones } from '@phosphor-icons/react'

export const Salon = () => {
  const { user } = useAuth()
  const toast = useToast()

  // --- All published weeks (sorted by week_of ASC) + active week ---
  const [allWeeks, setAllWeeks] = useState([])
  const [activeIndex, setActiveIndex] = useState(null)
  const activeWeek = activeIndex !== null ? allWeeks[activeIndex] || null : null
  const activeWeekId = activeWeek?.id
  const isLatestWeek = activeIndex === allWeeks.length - 1

  const [responses, setResponses] = useState([])
  const [commonplaceEntries, setCommonplaceEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCommonplace, setShowCommonplace] = useState(false)
  const [hasNewCommonplaceEntries, setHasNewCommonplaceEntries] = useState(false)
  const [nextWeekTitle, setNextWeekTitle] = useState(null)
  const [textSize, setTextSize] = useState(() => {
    try {
      const saved = localStorage.getItem('salon_text_size')
      return saved ? Number(saved) : 12
    } catch {
      return 12
    }
  })
  const [audioState, setAudioState] = useState('idle') // idle | loading | playing | paused
  const audioRef = useRef(null)

  // Ref to avoid stale closure in realtime callback
  const showCommonplaceRef = useRef(false)
  useEffect(() => { showCommonplaceRef.current = showCommonplace }, [showCommonplace])

  // Ref to guard against stale fetch results during rapid week swiping
  const currentWeekIdRef = useRef(null)

  // --- Continuous scroll-snap carousel ---
  // Pure arithmetic: scrollLeft / slideWidth = which slide is visible.
  // Slider syncs via direct DOM (no re-render). Title/counter via React state.
  const scrollContainerRef = useRef(null)
  const sliderRef = useRef(null)
  const snapRestoreRef = useRef(null)
  const lastScrollIndexRef = useRef(null)

  // Carousel scroll handler: arithmetic index from scroll position
  const handleCarouselScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || allWeeks.length === 0) return

    const slideWidth = container.clientWidth
    if (slideWidth <= 0) return

    // Sync slider continuously (direct DOM, no re-render)
    const slider = sliderRef.current
    if (slider && allWeeks.length > 1) {
      slider.value = String(container.scrollLeft / slideWidth)
    }

    // Pure arithmetic: position / slide_width = index
    const index = Math.round(container.scrollLeft / slideWidth)
    const clamped = Math.max(0, Math.min(index, allWeeks.length - 1))

    if (clamped !== lastScrollIndexRef.current) {
      lastScrollIndexRef.current = clamped
      hapticTap()
      setActiveIndex(clamped)
    }
  }, [allWeeks.length])

  // Initial scroll to latest week (instant, no haptic)
  useEffect(() => {
    if (allWeeks.length === 0) return
    lastScrollIndexRef.current = allWeeks.length - 1
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const c = scrollContainerRef.current
        if (c) c.scrollLeft = c.scrollWidth
        const s = sliderRef.current
        if (s) s.value = String(allWeeks.length - 1)
      })
    })
  }, [allWeeks.length])

  // Prevent browser back/forward on horizontal trackpad swipes
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault()
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [allWeeks.length])

  // Slider drag → scroll container (continuous, real-time)
  const handleSliderInput = useCallback((e) => {
    const container = scrollContainerRef.current
    if (!container) return
    // Disable snap while dragging so text tracks finger smoothly
    container.style.scrollSnapType = 'none'
    const value = Number(e.target.value)
    const maxScroll = container.scrollWidth - container.clientWidth
    container.scrollLeft = (value / Math.max(allWeeks.length - 1, 1)) * maxScroll
    // Re-enable snap + snap to nearest week after drag stops
    clearTimeout(snapRestoreRef.current)
    snapRestoreRef.current = setTimeout(() => {
      container.style.scrollSnapType = 'x mandatory'
      const slideWidth = container.clientWidth
      const targetIndex = Math.round(container.scrollLeft / slideWidth)
      container.scrollTo({ left: targetIndex * slideWidth, behavior: 'smooth' })
    }, 150)
  }, [allWeeks.length])

  // Timeline bar tap → smooth scroll (scroll event syncs slider automatically)
  const handleWeekSelect = useCallback((weekId) => {
    const container = scrollContainerRef.current
    if (!container) return
    const index = allWeeks.findIndex(w => w.id === weekId)
    if (index < 0) return
    container.scrollTo({ left: index * container.clientWidth, behavior: 'smooth' })
  }, [allWeeks])

  // Mouse drag for desktop (touch is native scroll-snap)
  const dragRef = useRef(null)

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'touch') return
    const container = scrollContainerRef.current
    if (!container) return
    dragRef.current = { x: e.clientX, scrollLeft: container.scrollLeft }
    container.style.scrollSnapType = 'none'
    container.style.cursor = 'grabbing'
    container.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current || e.pointerType === 'touch') return
    const container = scrollContainerRef.current
    if (!container) return
    container.scrollLeft = dragRef.current.scrollLeft - (e.clientX - dragRef.current.x)
  }, [])

  const onPointerUp = useCallback((e) => {
    if (!dragRef.current || e.pointerType === 'touch') return
    dragRef.current = null
    const container = scrollContainerRef.current
    if (!container) return
    container.style.scrollSnapType = 'x mandatory'
    container.style.cursor = ''
    const slideWidth = container.clientWidth
    const targetIndex = Math.round(container.scrollLeft / slideWidth)
    container.scrollTo({ left: targetIndex * slideWidth, behavior: 'smooth' })
  }, [])

  // --- Data fetching ---

  const fetchAllPublishedWeeks = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]

    // Which Monday are we in? (UTC)
    const now = new Date()
    const utcDay = now.getUTCDay()
    const diff = utcDay === 0 ? 6 : utcDay - 1
    const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff))
    const thisMondayStr = thisMonday.toISOString().split('T')[0]

    // Cache is valid only if it was set during the same week
    try {
      const cached = localStorage.getItem('salon_weeks_all_v2')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed._weekMonday === thisMondayStr && Array.isArray(parsed.weeks)) {
          return parsed.weeks
        }
      }
    } catch {
      // Corrupted cache — fall through to network fetch
    }

    const { data, error } = await supabase
      .from('salon_weeks')
      .select('*')
      .lte('week_of', today)
      .order('week_of', { ascending: true })

    if (error) return []

    const weeks = data || []
    try {
      localStorage.setItem('salon_weeks_all_v2', JSON.stringify({
        weeks,
        _weekMonday: thisMondayStr
      }))
    } catch {
      // localStorage full — continue without caching
    }

    return weeks
  }, [])

  const fetchNextWeek = useCallback(async (currentWeekOf) => {
    const { data } = await supabase
      .from('salon_weeks')
      .select('parlor_title')
      .gt('week_of', currentWeekOf)
      .order('week_of', { ascending: true })
      .limit(1)
      .maybeSingle()

    setNextWeekTitle(data?.parlor_title || null)
  }, [])

  const fetchResponses = useCallback(async (weekId) => {
    const { data, error } = await supabase
      .from('parlor_responses')
      .select('*, profiles(display_name, profile_photo_url)')
      .eq('salon_week_id', weekId)
      .order('created_at', { ascending: true })

    if (error) return
    if (currentWeekIdRef.current !== weekId) return
    setResponses(data || [])
  }, [])

  const fetchCommonplaceEntries = useCallback(async (weekId) => {
    const { data, error } = await supabase
      .from('commonplace_entries')
      .select('*, profiles(display_name, profile_photo_url)')
      .eq('salon_week_id', weekId)
      .order('created_at', { ascending: false })

    if (error) return
    if (currentWeekIdRef.current !== weekId) return
    setCommonplaceEntries(data || [])
  }, [])

  const checkNewCommonplaceEntries = useCallback(async (weekId) => {
    const { data: lastSeenData } = await supabase
      .from('commonplace_last_seen')
      .select('last_seen_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!lastSeenData) {
      const { count } = await supabase
        .from('commonplace_entries')
        .select('*', { count: 'exact', head: true })
        .eq('salon_week_id', weekId)
        .neq('user_id', user.id)

      setHasNewCommonplaceEntries((count || 0) > 0)
      return
    }

    const { count } = await supabase
      .from('commonplace_entries')
      .select('*', { count: 'exact', head: true })
      .eq('salon_week_id', weekId)
      .neq('user_id', user.id)
      .gt('created_at', lastSeenData.last_seen_at)

    setHasNewCommonplaceEntries((count || 0) > 0)
  }, [user.id])

  // --- Audio ---

  const handleAudioToggle = async () => {
    if (!activeWeek) return

    if (audioState === 'playing' && audioRef.current) {
      audioRef.current.pause()
      setAudioState('paused')
      return
    }

    if (audioState === 'paused' && audioRef.current) {
      audioRef.current.play()
      setAudioState('playing')
      return
    }

    setAudioState('loading')
    try {
      const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/salon-audio/week-${activeWeek.id}.mp3`
      const headRes = await fetch(publicUrl, { method: 'HEAD' })
      let audioUrl = null

      if (headRes.ok) {
        audioUrl = publicUrl
      } else {
        const { data, error } = await supabase.functions.invoke('tts', {
          body: { salon_week_id: activeWeek.id }
        })
        if (error) throw error
        if (!data?.url) throw new Error('No audio URL')
        audioUrl = data.url
      }

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current.src = ''
        audioRef.current = null
      }

      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => setAudioState('idle')
      audio.onerror = () => setAudioState('idle')
      await audio.play()
      setAudioState('playing')
    } catch (_err) {
      setAudioState('idle')
    }
  }

  // --- Stop audio when switching weeks ---

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.src = ''
      audioRef.current = null
    }
    setAudioState('idle')
  }, [activeWeekId])

  // --- Cleanup audio on unmount ---

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [])

  // --- Initial load ---

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      setLoading(true)
      const weeks = await fetchAllPublishedWeeks()
      setAllWeeks(weeks)

      if (weeks.length > 0) {
        const latestIndex = weeks.length - 1
        const latestWeek = weeks[latestIndex]
        setActiveIndex(latestIndex)
        currentWeekIdRef.current = latestWeek.id

        await Promise.all([
          fetchResponses(latestWeek.id),
          fetchCommonplaceEntries(latestWeek.id),
          checkNewCommonplaceEntries(latestWeek.id),
          fetchNextWeek(latestWeek.week_of)
        ])
      }
      setLoading(false)
    }

    loadData()
  }, [user?.id, fetchAllPublishedWeeks, fetchResponses, fetchCommonplaceEntries, checkNewCommonplaceEntries, fetchNextWeek])

  // --- Fetch responses/commonplace when swiping to a different week ---

  const prevActiveWeekIdRef = useRef(null)
  useEffect(() => {
    if (!activeWeekId || activeWeekId === prevActiveWeekIdRef.current) return
    currentWeekIdRef.current = activeWeekId
    // Skip on initial load (handled by loadData above)
    if (prevActiveWeekIdRef.current !== null) {
      fetchResponses(activeWeekId)
      fetchCommonplaceEntries(activeWeekId)
      checkNewCommonplaceEntries(activeWeekId)
    }
    prevActiveWeekIdRef.current = activeWeekId
  }, [activeWeekId, fetchResponses, fetchCommonplaceEntries, checkNewCommonplaceEntries])

  // --- Realtime subscriptions (scoped to active week) ---

  useEffect(() => {
    if (!activeWeek) return

    const parlorChannel = supabase
      .channel(`parlor-responses-${activeWeek.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parlor_responses',
          filter: `salon_week_id=eq.${activeWeek.id}`
        },
        () => {
          fetchResponses(activeWeek.id)
        }
      )
      .subscribe()

    const commonplaceChannel = supabase
      .channel(`commonplace-entries-${activeWeek.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commonplace_entries',
          filter: `salon_week_id=eq.${activeWeek.id}`
        },
        () => {
          fetchCommonplaceEntries(activeWeek.id)
          if (!showCommonplaceRef.current) {
            setHasNewCommonplaceEntries(true)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(parlorChannel)
      supabase.removeChannel(commonplaceChannel)
    }
  }, [activeWeek?.id, fetchResponses, fetchCommonplaceEntries])

  // --- CRUD: Parlor responses ---

  const handleSubmitResponse = async (text) => {
    if (!activeWeek) return
    const { error } = await supabase
      .from('parlor_responses')
      .insert({ salon_week_id: activeWeek.id, user_id: user.id, text })

    if (error) throw error
  }

  const handleEditResponse = async (id, text) => {
    const { error } = await supabase
      .from('parlor_responses')
      .update({ text, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  const handleDeleteResponse = async (id) => {
    const { error } = await supabase
      .from('parlor_responses')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete response')
    }
  }

  // --- CRUD: Commonplace entries ---

  const handleSubmitCommonplaceEntry = async (text) => {
    if (!activeWeek) return
    const { error } = await supabase
      .from('commonplace_entries')
      .insert({ salon_week_id: activeWeek.id, user_id: user.id, text })

    if (error) throw error
  }

  const handleEditCommonplaceEntry = async (id, text) => {
    const { error } = await supabase
      .from('commonplace_entries')
      .update({ text, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  const handleDeleteCommonplaceEntry = async (id) => {
    const { error } = await supabase
      .from('commonplace_entries')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete entry')
    }
  }

  // --- Commonplace Book open/close ---

  const handleOpenCommonplace = async () => {
    setShowCommonplace(true)
    setHasNewCommonplaceEntries(false)

    await supabase
      .from('commonplace_last_seen')
      .upsert({ user_id: user.id, last_seen_at: new Date().toISOString() })
  }

  const handleCloseCommonplace = () => {
    setShowCommonplace(false)
  }

  // --- Loading state ---

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  // --- Empty state: no salon weeks ---

  if (allWeeks.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <img
          src="/images/salon-couch-ready.png"
          alt=""
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'contain',
            opacity: 0.5,
            marginBottom: '24px'
          }}
        />
        <p style={{
          fontStyle: 'italic',
          color: '#A89F91',
          fontSize: '16px'
        }}>
          The Salon is being prepared for its first gathering...
        </p>
      </div>
    )
  }

  // --- Main render ---

  return (
    <>
      <div style={{
        height: 'calc(100dvh - 62px)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '720px',
        margin: '0 auto',
        padding: '20px 20px 0',
        overflow: 'hidden'
      }}>
        {/* FIXED TOP: icon + timeline + title */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ textAlign: 'center', margin: '-16px 0 -24px' }}>
            <img
              src="/images/salon-couch-ready.png"
              alt=""
              style={{
                width: '174px',
                height: '174px',
                objectFit: 'contain',
                opacity: 1,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.3)) drop-shadow(0 0 2px rgba(0,0,0,0.15)) contrast(1.15) brightness(1.08) saturate(1.1)'
              }}
            />
          </div>

          {/* Historical Timeline */}
          {allWeeks.length > 1 && (
            <div style={{ margin: '0 0 6px' }}>
              <HistoricalTimeline
                weeks={allWeeks}
                activeWeekId={activeWeekId}
                onWeekSelect={handleWeekSelect}
              />
            </div>
          )}

          {/* Title row */}
          <h2 key={activeIndex} style={{ margin: '0 0 4px 0' }}>
            <CalligraphyTitle text={activeWeek?.parlor_title} fontSize={26} />
          </h2>
          {/* Controls row: audio + text size slider */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', margin: '0 0 8px 0' }}>
            {/* Audio play/pause */}
            <button
              onClick={handleAudioToggle}
              disabled={audioState === 'loading'}
              style={{
                background: 'none',
                border: 'none',
                cursor: audioState === 'loading' ? 'wait' : 'pointer',
                padding: '2px 4px',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label={audioState === 'playing' ? 'Pause audio' : 'Listen to essay'}
            >
              {audioState === 'idle' ? (
                <Headphones size={20} weight="duotone" color="#622722" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={audioState === 'playing' ? '#5C6B4A' : '#622722'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  {audioState === 'loading' && (
                    <circle cx="12" cy="12" r="3" fill="#622722" stroke="none" opacity="0.5">
                      <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {audioState === 'playing' && (
                    <>
                      <line x1="10" y1="10" x2="10" y2="14" stroke="#5C6B4A" strokeWidth="1.5">
                        <animate attributeName="y1" values="10;8;10" dur="0.5s" repeatCount="indefinite" />
                      </line>
                      <line x1="12" y1="9" x2="12" y2="14" stroke="#5C6B4A" strokeWidth="1.5">
                        <animate attributeName="y1" values="9;7;9" dur="0.4s" repeatCount="indefinite" />
                      </line>
                      <line x1="14" y1="10" x2="14" y2="14" stroke="#5C6B4A" strokeWidth="1.5">
                        <animate attributeName="y1" values="10;8;10" dur="0.6s" repeatCount="indefinite" />
                      </line>
                    </>
                  )}
                </svg>
              )}
            </button>
            {/* Text size slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: '#8C8578', fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 300 }}>A</span>
              <input
                type="range"
                min="11"
                max="22"
                step="1"
                value={textSize}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setTextSize(val)
                  try { localStorage.setItem('salon_text_size', String(val)) } catch { /* ignore */ }
                }}
                className="salon-slider"
                style={{ width: '70px' }}
                aria-label="Text size"
              />
              <span style={{ fontSize: '16px', color: '#8C8578', fontFamily: "'Source Serif 4', Georgia, serif" }}>A</span>
            </div>
          </div>
        </div>

        {/* SCROLL-SNAP CAROUSEL: glide between weeks */}
        <div
          ref={scrollContainerRef}
          className="hide-scrollbar"
          onScroll={handleCarouselScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            flex: 1,
            minHeight: 0,
            maxHeight: '47.5vh',
            overflowX: 'auto',
            overflowY: 'hidden',
            display: 'flex',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            borderTop: '1px solid #E8DCC8',
            background: '#FFFEFA',
            borderRadius: '4px',
            cursor: 'grab',
          }}
        >
          {allWeeks.map((week) => (
            <div
              key={week.id}
              style={{
                flex: '0 0 100%',
                width: '100%',
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                paddingTop: '12px',
              }}
            >
              <ParlorText salonWeek={week} hideTitle textSize={textSize} />
            </div>
          ))}
        </div>

        {/* Week slider */}
        {allWeeks.length > 1 && (
            <div style={{
              flexShrink: 0,
              padding: '4px 8px 2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                fontSize: '8px',
                color: '#A89F91',
                whiteSpace: 'nowrap',
                fontStyle: 'italic',
                minWidth: '20px',
                textAlign: 'right',
              }}>
                {activeIndex !== null ? activeIndex + 1 : allWeeks.length}/{allWeeks.length}
              </span>
              <input
                ref={sliderRef}
                type="range"
                min="0"
                max={allWeeks.length - 1}
                step="0.001"
                defaultValue={allWeeks.length - 1}
                onInput={handleSliderInput}
                className="salon-slider salon-slider-week"
                style={{ flex: 1 }}
                aria-label="Browse weeks"
              />
            </div>
        )}

        {/* Next week teaser — only when viewing the most recent week */}
        {nextWeekTitle && isLatestWeek && (
          <div style={{
            flexShrink: 0,
            padding: '4px 0 0',
            borderTop: '1px solid #E8DCC8'
          }}>
            <p style={{
              fontSize: '11px',
              color: '#8C8578',
              fontStyle: 'italic',
              margin: 0,
              letterSpacing: '0.02em'
            }}>
              Next week: <span style={{ color: '#6B6156' }}>{nextWeekTitle}</span>
            </p>
          </div>
        )}

        {/* FIXED BOTTOM: responses */}
        <div style={{
          flexShrink: 0,
          borderTop: (nextWeekTitle && isLatestWeek) ? 'none' : '1px solid #E8DCC8',
          paddingBottom: '4px'
        }}>
          <ParlorResponses
            responses={responses}
            userId={user.id}
            onSubmit={handleSubmitResponse}
            onEdit={handleEditResponse}
            onDelete={handleDeleteResponse}
            compact
          />
        </div>
      </div>

      {/* Typewriter FAB + Commonplace Book — hidden for now, will revisit integration */}
      {/* <button
        className="typewriter-fab"
        onClick={handleOpenCommonplace}
        style={{
          position: 'fixed',
          bottom: '-4px',
          right: '16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          zIndex: 10
        }}
        aria-label="Open Commonplace Book"
      >
        <img
          src="/images/typewriter-ready.png"
          alt="Commonplace Book"
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'contain',
            display: 'block'
          }}
        />
        {hasNewCommonplaceEntries && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#E8534F'
          }} />
        )}
      </button>

      <CommonplaceBook
        isOpen={showCommonplace}
        onClose={handleCloseCommonplace}
        entries={commonplaceEntries}
        userId={user.id}
        onSubmit={handleSubmitCommonplaceEntry}
        onEdit={handleEditCommonplaceEntry}
        onDelete={handleDeleteCommonplaceEntry}
      /> */}
    </>
  )
}
