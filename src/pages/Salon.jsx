import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ParlorText } from '../components/salon/ParlorText'
import { ParlorResponses } from '../components/salon/ParlorResponses'
import { TypewriterFAB } from '../components/salon/TypewriterFAB'
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

  // Ref to avoid stale closure in realtime callback
  const showCommonplaceRef = useRef(false)
  useEffect(() => { showCommonplaceRef.current = showCommonplace }, [showCommonplace])

  // --- Data fetching ---

  const fetchCurrentWeek = useCallback(async () => {
    const { data, error } = await supabase
      .from('salon_weeks')
      .select('*')
      .is('archived_at', null)
      .order('week_of', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching salon week:', error)
    }
    return data || null
  }, [])

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
          checkNewCommonplaceEntries(week.id)
        ])
      }
      setLoading(false)
    }

    loadData()
  }, [user?.id, fetchCurrentWeek, fetchResponses, fetchCommonplaceEntries, checkNewCommonplaceEntries])

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
      <div className="container">
        {/* Salon Header */}
        <div style={{ textAlign: 'left', marginTop: '8px', marginBottom: '16px' }}>
          <p style={{
            fontSize: '10px',
            color: '#777',
            letterSpacing: '0.04em',
            margin: 0
          }}>
            Semaine du {formatWeekDate(salonWeek.week_of)}
          </p>
        </div>

        {/* Decorative couch image */}
        <div style={{ position: 'relative' }}>
          <img
            src="/images/salon-couch-ready.png"
            alt=""
            style={{
              position: 'absolute',
              top: '-55px',
              right: '10%',
              width: '112px',
              height: '112px',
              objectFit: 'contain',
              opacity: 1,
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* The Parlor */}
        <ParlorText salonWeek={salonWeek} />

        {/* Vos reflexions */}
        <ParlorResponses
          responses={responses}
          userId={user.id}
          onSubmit={handleSubmitResponse}
          onEdit={handleEditResponse}
          onDelete={handleDeleteResponse}
        />
      </div>

      {/* Typewriter FAB */}
      <TypewriterFAB
        hasNewEntries={hasNewCommonplaceEntries}
        onClick={handleOpenCommonplace}
      />

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
