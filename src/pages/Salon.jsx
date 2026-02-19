import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ParlorText } from '../components/salon/ParlorText'
import { ParlorResponses } from '../components/salon/ParlorResponses'
import { CommonplaceBook } from '../components/salon/CommonplaceBook'

const formatWeekDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export const Salon = () => {
  const { user } = useAuth()
  const [salonWeek, setSalonWeek] = useState(null)
  const [responses, setResponses] = useState([])
  const [commonplaceEntries, setCommonplaceEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCommonplace, setShowCommonplace] = useState(false)
  const [hasNewCommonplaceEntries, setHasNewCommonplaceEntries] = useState(false)
  const [nextWeekTitle, setNextWeekTitle] = useState(null)
  const [textSize, setTextSize] = useState(() => {
    try {
      const saved = localStorage.getItem('salon_text_size')
      return saved ? Number(saved) : 13
    } catch {
      return 13
    }
  })
  const [audioState, setAudioState] = useState('idle') // idle | loading | playing | paused
  const audioRef = useRef(null)

  // Ref to avoid stale closure in realtime callback
  const showCommonplaceRef = useRef(false)
  useEffect(() => { showCommonplaceRef.current = showCommonplace }, [showCommonplace])

  // --- Data fetching ---

  const fetchCurrentWeek = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]

    // Which Monday are we in? (UTC)
    const now = new Date()
    const utcDay = now.getUTCDay()
    const diff = utcDay === 0 ? 6 : utcDay - 1
    const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff))
    const thisMondayStr = thisMonday.toISOString().split('T')[0]

    // Cache is valid only if it was set during the same week
    try {
      const cached = localStorage.getItem('salon_week_v2')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed._weekMonday === thisMondayStr) {
          return parsed
        }
      }
    } catch {
      // Corrupted cache or localStorage unavailable — fall through to network fetch
    }

    const { data, error } = await supabase
      .from('salon_weeks')
      .select('*')
      .lte('week_of', today)
      .order('week_of', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // silently handled
    }

    if (data) {
      try {
        localStorage.setItem('salon_week_v2', JSON.stringify({
          ...data,
          _weekMonday: thisMondayStr
        }))
      } catch {
        // localStorage full or unavailable — continue without caching
      }
    }

    return data || null
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

  const handleAudioToggle = async () => {
    // If already playing, pause
    if (audioState === 'playing' && audioRef.current) {
      audioRef.current.pause()
      setAudioState('paused')
      return
    }

    // If paused, resume
    if (audioState === 'paused' && audioRef.current) {
      audioRef.current.play()
      setAudioState('playing')
      return
    }

    // Otherwise, try public URL first (cached), then generate via Edge Function
    setAudioState('loading')
    try {
      const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/salon-audio/week-${salonWeek.id}.mp3`

      // Check if cached audio exists
      const headRes = await fetch(publicUrl, { method: 'HEAD' })
      let audioUrl = null

      if (headRes.ok) {
        audioUrl = publicUrl
      } else {
        // Generate via Edge Function
        const { data, error } = await supabase.functions.invoke('tts', {
          body: { salon_week_id: salonWeek.id }
        })
        if (error) throw error
        if (!data?.url) throw new Error('No audio URL')
        audioUrl = data.url
      }

      // Clean up previous audio instance to prevent memory leak
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

  const fetchResponses = useCallback(async (weekId) => {
    const { data, error } = await supabase
      .from('parlor_responses')
      .select('*, profiles(display_name, profile_photo_url)')
      .eq('salon_week_id', weekId)
      .order('created_at', { ascending: true })

    if (error) return
    setResponses(data || [])
  }, [])

  const fetchCommonplaceEntries = useCallback(async (weekId) => {
    const { data, error } = await supabase
      .from('commonplace_entries')
      .select('*, profiles(display_name, profile_photo_url)')
      .eq('salon_week_id', weekId)
      .order('created_at', { ascending: false })

    if (error) return
    setCommonplaceEntries(data || [])
  }, [])

  const checkNewCommonplaceEntries = useCallback(async (weekId) => {
    // Get user's last seen timestamp
    const { data: lastSeenData } = await supabase
      .from('commonplace_last_seen')
      .select('last_seen_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!lastSeenData) {
      // User has never opened the commonplace book — any entries are "new"
      const { count } = await supabase
        .from('commonplace_entries')
        .select('*', { count: 'exact', head: true })
        .eq('salon_week_id', weekId)
        .neq('user_id', user.id)

      setHasNewCommonplaceEntries((count || 0) > 0)
      return
    }

    // Check for entries newer than last seen
    const { count } = await supabase
      .from('commonplace_entries')
      .select('*', { count: 'exact', head: true })
      .eq('salon_week_id', weekId)
      .neq('user_id', user.id)
      .gt('created_at', lastSeenData.last_seen_at)

    setHasNewCommonplaceEntries((count || 0) > 0)
  }, [user.id])

  // --- Initial load ---

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      setLoading(true)
      const week = await fetchCurrentWeek()
      setSalonWeek(week)

      if (week) {
        await Promise.all([
          fetchResponses(week.id),
          fetchCommonplaceEntries(week.id),
          checkNewCommonplaceEntries(week.id),
          fetchNextWeek(week.week_of)
        ])
      }
      setLoading(false)
    }

    loadData()
  }, [user?.id, fetchCurrentWeek, fetchResponses, fetchCommonplaceEntries, checkNewCommonplaceEntries, fetchNextWeek])

  // --- Realtime subscriptions ---

  useEffect(() => {
    if (!salonWeek) return

    const parlorChannel = supabase
      .channel(`parlor-responses-${salonWeek.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parlor_responses',
          filter: `salon_week_id=eq.${salonWeek.id}`
        },
        () => {
          fetchResponses(salonWeek.id)
        }
      )
      .subscribe()

    const commonplaceChannel = supabase
      .channel(`commonplace-entries-${salonWeek.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commonplace_entries',
          filter: `salon_week_id=eq.${salonWeek.id}`
        },
        () => {
          fetchCommonplaceEntries(salonWeek.id)
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
  }, [salonWeek, fetchResponses, fetchCommonplaceEntries])

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

  // --- CRUD: Parlor responses ---

  const handleSubmitResponse = async (text) => {
    const { error } = await supabase
      .from('parlor_responses')
      .insert({ salon_week_id: salonWeek.id, user_id: user.id, text })

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
      // silently handled
    }
  }

  // --- CRUD: Commonplace entries ---

  const handleSubmitCommonplaceEntry = async (text) => {
    const { error } = await supabase
      .from('commonplace_entries')
      .insert({ salon_week_id: salonWeek.id, user_id: user.id, text })

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
      // silently handled
    }
  }

  // --- Commonplace Book open/close ---

  const handleOpenCommonplace = async () => {
    setShowCommonplace(true)
    setHasNewCommonplaceEntries(false)

    // Update last seen
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

  // --- Empty state: no salon week ---

  if (!salonWeek) {
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
          color: '#777',
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
        padding: '0 20px',
        overflow: 'hidden'
      }}>
        {/* FIXED TOP: icon + date + title */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ textAlign: 'center', margin: '-16px 0 -40px' }}>
            <img
              src="/images/salon-couch-ready.png"
              alt=""
              style={{
                width: '158px',
                height: '158px',
                objectFit: 'contain',
                opacity: 0.85,
                pointerEvents: 'none'
              }}
            />
          </div>
          <p style={{
            fontSize: '10px',
            color: '#777',
            letterSpacing: '0.04em',
            margin: '0 0 2px 0'
          }}>
            Semaine du {formatWeekDate(salonWeek.week_of)}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 8px 0' }}>
            <h2
              className="handwritten"
              style={{
                fontSize: '26px',
                textAlign: 'left',
                margin: 0,
                color: '#2C2C2C',
                flex: 1
              }}
            >
              {salonWeek.parlor_title}
            </h2>
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
                flexShrink: 0
              }}
              aria-label={audioState === 'playing' ? 'Pause audio' : 'Listen to essay'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={audioState === 'playing' ? '#4A7BA7' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                {audioState === 'loading' && (
                  <circle cx="12" cy="12" r="3" fill="#999" stroke="none" opacity="0.5">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
                  </circle>
                )}
                {audioState === 'playing' && (
                  <>
                    <line x1="10" y1="10" x2="10" y2="14" stroke="#4A7BA7" strokeWidth="1.5">
                      <animate attributeName="y1" values="10;8;10" dur="0.5s" repeatCount="indefinite" />
                    </line>
                    <line x1="12" y1="9" x2="12" y2="14" stroke="#4A7BA7" strokeWidth="1.5">
                      <animate attributeName="y1" values="9;7;9" dur="0.4s" repeatCount="indefinite" />
                    </line>
                    <line x1="14" y1="10" x2="14" y2="14" stroke="#4A7BA7" strokeWidth="1.5">
                      <animate attributeName="y1" values="10;8;10" dur="0.6s" repeatCount="indefinite" />
                    </line>
                  </>
                )}
              </svg>
            </button>
            {/* Text size slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', color: '#999', fontFamily: 'Georgia, serif' }}>A</span>
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
                style={{ width: '80px', height: '2px', accentColor: '#999', cursor: 'pointer' }}
                aria-label="Text size"
              />
              <span style={{ fontSize: '17px', color: '#999', fontFamily: 'Georgia, serif' }}>A</span>
            </div>
          </div>
        </div>

        {/* SCROLLABLE MIDDLE: essay body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
          borderTop: '1px solid #eee',
          paddingTop: '12px',
          background: '#FFFFFF'
        }}>
          <ParlorText salonWeek={salonWeek} hideTitle textSize={textSize} />
        </div>

        {/* Next week teaser */}
        {nextWeekTitle && (
          <div style={{
            flexShrink: 0,
            padding: '4px 0 0',
            borderTop: '1px solid #eee'
          }}>
            <p style={{
              fontSize: '11px',
              color: '#999',
              fontStyle: 'italic',
              margin: 0,
              letterSpacing: '0.02em'
            }}>
              Next week: <span style={{ color: '#666' }}>{nextWeekTitle}</span>
            </p>
          </div>
        )}

        {/* FIXED BOTTOM: responses */}
        <div style={{
          flexShrink: 0,
          borderTop: nextWeekTitle ? 'none' : '1px solid #eee',
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

      {/* Typewriter — fixed bottom-right of screen */}
      <button
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
            width: '100px',
            height: '100px',
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

      {/* Commonplace Book Overlay */}
      <CommonplaceBook
        isOpen={showCommonplace}
        onClose={handleCloseCommonplace}
        entries={commonplaceEntries}
        userId={user.id}
        onSubmit={handleSubmitCommonplaceEntry}
        onEdit={handleEditCommonplaceEntry}
        onDelete={handleDeleteCommonplaceEntry}
      />
    </>
  )
}
