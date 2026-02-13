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
    const saved = localStorage.getItem('salon_text_size')
    return saved ? Number(saved) : 13
  })

  // Ref to avoid stale closure in realtime callback
  const showCommonplaceRef = useRef(false)
  useEffect(() => { showCommonplaceRef.current = showCommonplace }, [showCommonplace])

  // --- Data fetching ---

  const fetchCurrentWeek = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]

    // Check localStorage cache — week content only changes on Mondays
    const cached = localStorage.getItem('salon_week')
    if (cached) {
      const parsed = JSON.parse(cached)
      // Cache is valid if the stored week_of is still the most recent Monday <= today
      // and no newer Monday has arrived since caching
      if (parsed.week_of <= today && parsed._cachedUntil > today) {
        return parsed
      }
    }

    const { data, error } = await supabase
      .from('salon_weeks')
      .select('*')
      .lte('week_of', today)
      .order('week_of', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching salon week:', error)
    }

    if (data) {
      // Cache until the next Monday after this week_of
      const weekDate = new Date(data.week_of + 'T00:00:00')
      const nextMonday = new Date(weekDate)
      nextMonday.setDate(weekDate.getDate() + 7)
      localStorage.setItem('salon_week', JSON.stringify({
        ...data,
        _cachedUntil: nextMonday.toISOString().split('T')[0]
      }))
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

  const handleTextSize = (delta) => {
    setTextSize(prev => {
      const next = Math.min(22, Math.max(11, prev + delta))
      localStorage.setItem('salon_text_size', String(next))
      return next
    })
  }

  const fetchResponses = useCallback(async (weekId) => {
    const { data, error } = await supabase
      .from('parlor_responses')
      .select('*, profiles(display_name, profile_photo_url)')
      .eq('salon_week_id', weekId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching responses:', error)
      return
    }
    setResponses(data || [])
  }, [])

  const fetchCommonplaceEntries = useCallback(async (weekId) => {
    const { data, error } = await supabase
      .from('commonplace_entries')
      .select('*, profiles(display_name, profile_photo_url)')
      .eq('salon_week_id', weekId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching commonplace entries:', error)
      return
    }
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
      console.error('Error deleting response:', error)
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
      console.error('Error deleting entry:', error)
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
          <h2
            className="handwritten"
            style={{
              fontSize: '26px',
              textAlign: 'left',
              margin: '0 0 8px 0',
              color: '#2C2C2C'
            }}
          >
            {salonWeek.parlor_title}
          </h2>
        </div>

        {/* SCROLLABLE MIDDLE: essay body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
          borderTop: '1px solid #eee',
          paddingTop: '12px',
          background: '#FFFFFF',
          position: 'relative'
        }}>
          {/* Text size slider */}
          <div style={{
            position: 'sticky',
            top: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0 5% 4px',
            maxWidth: '640px',
            margin: '0 auto',
            zIndex: 1
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.92)',
              borderRadius: '6px',
              padding: '3px 8px'
            }}>
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
                  localStorage.setItem('salon_text_size', String(val))
                }}
                style={{
                  width: '80px',
                  height: '2px',
                  accentColor: '#999',
                  cursor: 'pointer'
                }}
                aria-label="Text size"
              />
              <span style={{ fontSize: '17px', color: '#999', fontFamily: 'Georgia, serif' }}>A</span>
            </div>
          </div>
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
        onClick={handleOpenCommonplace}
        style={{
          position: 'fixed',
          bottom: '4px',
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
            width: '74px',
            height: '74px',
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
