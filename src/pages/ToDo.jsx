import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { EmptyStateFantom } from '../components/EmptyStateFantom'
import { FilterDropdown } from '../components/FilterDropdown'
import { ActivityCard } from '../components/ActivityCard'
import { CoverSearchModal } from '../components/cover-search/CoverSearchModal'
import { useScrollLock } from '../hooks/useScrollLock'
import { ConfirmModal } from '../components/ConfirmModal'
import { useEscapeClose } from '../hooks/useEscapeClose'
import { Plus } from '@phosphor-icons/react'

// Parse date_text into date_parsed
const parseDate = (dateText) => {
  if (!dateText || dateText.toLowerCase().includes('anytime') || dateText.toLowerCase().includes('every')) {
    return null
  }

  // Strip common prefixes: "Until Mar 15" → "Mar 15", "Starting Feb 24" → "Feb 24"
  let text = dateText.trim().replace(/^(until|starting|from|by)\s+/i, '')

  // Try specific date with year: "Feb 14, 2026" or "February 14, 2026"
  const specificDateMatch = text.match(/(\w+)\s+(\d+),?\s+(\d{4})/)
  if (specificDateMatch) {
    const [, month, day, year] = specificDateMatch
    const date = new Date(`${month} ${day}, ${year}`)
    if (!isNaN(date)) {
      return date.toISOString().split('T')[0]
    }
  }

  // Try comma-separated days: "Feb 19,20,11" or "Feb 19, 20, 11" — uses the latest date
  const multiDayMatch = text.match(/^(\w+)\s+([\d,\s]+)$/)
  if (multiDayMatch) {
    const [, month, daysStr] = multiDayMatch
    const days = daysStr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
    if (days.length > 0) {
      const maxDay = Math.max(...days)
      const currentYear = new Date().getFullYear()
      const date = new Date(`${month} ${maxDay}, ${currentYear}`)
      if (!isNaN(date)) {
        return date.toISOString().split('T')[0]
      }
    }
  }

  // Try month + day without year: "Mar 15" or "February 24"
  const monthDayMatch = text.match(/^(\w+)\s+(\d{1,2})$/)
  if (monthDayMatch) {
    const [, month, day] = monthDayMatch
    const currentYear = new Date().getFullYear()
    const date = new Date(`${month} ${day}, ${currentYear}`)
    if (!isNaN(date)) {
      return date.toISOString().split('T')[0]
    }
  }

  // Try month only: "February" or "February 2026"
  const monthMatch = text.match(/^(\w+)\s*(\d{4})?$/)
  if (monthMatch) {
    const [, month, year] = monthMatch
    const currentYear = new Date().getFullYear()
    const targetYear = year ? parseInt(year) : currentYear
    const date = new Date(`${month} 1, ${targetYear}`)
    if (!isNaN(date)) {
      // Get last day of month
      const lastDay = new Date(targetYear, date.getMonth() + 1, 0)
      return lastDay.toISOString().split('T')[0]
    }
  }

  return null
}

const CITY_OPTIONS = ['New York', 'London', 'Paris']

export const ToDo = () => {
  const { profile } = useAuth()
  const toast = useToast()
  const [activities, setActivities] = useState([])
  const [profiles, setProfiles] = useState({})
  const [interests, setInterests] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null)
  const [cityFilter, setCityFilter] = useState('all')

  // Form state
  const [description, setDescription] = useState('')
  const [dateText, setDateText] = useState('')
  const [city, setCity] = useState('')
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showCoverSearch, setShowCoverSearch] = useState(false)
  const [error, setError] = useState('')
  const [confirmState, setConfirmState] = useState(null)

  // Track initial form values to detect dirty state
  const initialFormRef = useRef(null)

  useEffect(() => {
    if (profile) {
      autoArchiveActivities().then(() => {
        fetchActivities()
      })
    }
  }, [profile])

  const isFormDirty = () => {
    if (!initialFormRef.current) return false
    const init = initialFormRef.current
    return description !== init.description || dateText !== init.dateText ||
      city !== init.city || location !== init.location || price !== init.price ||
      imageUrl !== init.imageUrl
  }

  useScrollLock(showModal)
  useEscapeClose(showModal, () => setShowModal(false), isFormDirty)

  const autoArchiveActivities = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Archive activities with parsed dates in the past
      await supabase
        .from('activities')
        .update({ is_archived: true })
        .lt('date_parsed', today)
        .eq('is_archived', false)

      // Re-parse activities with null date_parsed (handles parser improvements)
      const { data: unparsed } = await supabase
        .from('activities')
        .select('id, date_text')
        .is('date_parsed', null)
        .eq('is_archived', false)
        .not('date_text', 'is', null)

      if (unparsed?.length) {
        for (const activity of unparsed) {
          const parsed = parseDate(activity.date_text)
          if (parsed) {
            await supabase
              .from('activities')
              .update({
                date_parsed: parsed,
                is_archived: parsed < today
              })
              .eq('id', activity.id)
          }
        }
      }
    } catch (_err) {
      // silently handled
    }
  }

  const fetchActivities = async () => {
    try {
      setLoading(true)

      // Fetch activities from user's network
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('is_archived', false)
        .order('date_parsed', { ascending: true, nullsLast: true })

      if (activitiesError) throw activitiesError

      // Fetch all interests
      const activityIds = activitiesData.map((a) => a.id)
      const { data: interestsData, error: interestsError } = await supabase
        .from('activity_interests')
        .select('*')
        .in('activity_id', activityIds)

      if (interestsError) throw interestsError

      // Group interests by activity_id
      const interestsByActivity = {}
      interestsData.forEach((interest) => {
        if (!interestsByActivity[interest.activity_id]) {
          interestsByActivity[interest.activity_id] = []
        }
        interestsByActivity[interest.activity_id].push(interest)
      })

      // Fetch profiles for all users involved
      const userIds = [
        ...new Set([
          ...activitiesData.map((a) => a.user_id),
          ...interestsData.map((i) => i.user_id)
        ])
      ]

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, username, profile_photo_url')
        .in('id', userIds)

      if (profilesError) throw profilesError

      const profilesMap = {}
      profilesData.forEach((p) => {
        profilesMap[p.id] = p
      })

      setActivities(activitiesData)
      setInterests(interestsByActivity)
      setProfiles(profilesMap)
    } catch (_err) {
      toast.error('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingActivity(null)
    setDescription('')
    setDateText('')
    setCity('')
    setLocation('')
    setPrice('')
    setImageUrl('')
    setError('')
    initialFormRef.current = { description: '', dateText: '', city: '', location: '', price: '', imageUrl: '' }
    setShowModal(true)
  }

  const openEditModal = (activity) => {
    setEditingActivity(activity)
    setDescription(activity.description)
    setDateText(activity.date_text || '')
    setCity(activity.city || '')
    setLocation(activity.location || '')
    setPrice(activity.price || '')
    setImageUrl(activity.image_url || '')
    setError('')
    initialFormRef.current = {
      description: activity.description,
      dateText: activity.date_text || '',
      city: activity.city || '',
      location: activity.location || '',
      price: activity.price || '',
      imageUrl: activity.image_url || ''
    }
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const dateParsed = parseDate(dateText)

      if (editingActivity) {
        // Update existing activity
        const { error } = await supabase
          .from('activities')
          .update({
            description,
            date_text: dateText.trim() || null,
            date_parsed: dateParsed,
            city: city.trim() || null,
            location: location.trim() || null,
            price: price.trim() || null,
            image_url: imageUrl || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingActivity.id)

        if (error) throw error
      } else {
        // Create new activity
        const { error } = await supabase
          .from('activities')
          .insert({
            user_id: profile.id,
            description,
            date_text: dateText.trim() || null,
            date_parsed: dateParsed,
            city: city.trim() || null,
            location: location.trim() || null,
            price: price.trim() || null,
            image_url: imageUrl || null
          })

        if (error) throw error
      }

      setShowModal(false)
      fetchActivities()
      toast.success(editingActivity ? 'Activity updated' : 'Activity posted')
    } catch (err) {
      setError(err.message)
      toast.error('Failed to save activity')
    }
  }

  const handleDelete = (activityId) => {
    setConfirmState({
      message: 'Delete this activity?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('activities')
            .delete()
            .eq('id', activityId)

          if (error) throw error
          fetchActivities()
          toast.success('Activity deleted')
        } catch (_err) {
          toast.error('Failed to delete activity')
        }
      }
    })
  }

  const toggleInterest = async (activityId) => {
    try {
      const activityInterests = interests[activityId] || []
      const userInterest = activityInterests.find((i) => i.user_id === profile.id)

      if (userInterest) {
        // Remove interest
        const { error } = await supabase
          .from('activity_interests')
          .delete()
          .eq('id', userInterest.id)

        if (error) throw error
      } else {
        // Add interest
        const { error } = await supabase
          .from('activity_interests')
          .insert({
            activity_id: activityId,
            user_id: profile.id
          })

        if (error) throw error

        // Create notification for activity owner (if not the current user)
        const activity = activities.find(a => a.id === activityId)
        if (activity && activity.user_id !== profile.id) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: activity.user_id,
              type: 'activity_interest',
              actor_id: profile.id,
              reference_id: activityId,
              reference_name: activity.description,
              message: `${profile.display_name} is interested in ${activity.description}`
            })

          if (notifError) {
            // silently handled
          }
        }
      }

      fetchActivities()
    } catch (_err) {
      toast.error('Something went wrong')
    }
  }

  const getInterestedUsers = (activityId) => {
    const activityInterests = interests[activityId] || []
    return activityInterests
      .map((interest) => profiles[interest.user_id])
      .filter(Boolean)
  }

  const isUserInterested = (activityId) => {
    const activityInterests = interests[activityId] || []
    return activityInterests.some((i) => i.user_id === profile.id)
  }

  const getTodayFormatted = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const today = new Date()
    return `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading activities...</div>
      </div>
    )
  }

  const filteredActivities = cityFilter === 'all'
    ? activities
    : activities.filter(activity => activity.city === cityFilter)

  return (
    <div className="container" style={{ maxWidth: '720px', position: 'relative' }}>
      {/* Collage dancing people - only when activities exist */}
      {activities.length > 0 && (
        <img
          src="/images/activity-ready.png"
          alt=""
          style={{
            position: 'absolute',
            top: '8px',
            right: '12%',
            width: '144px',
            height: 'auto',
            opacity: 0.75,
            pointerEvents: 'none',
            zIndex: 0,
            animation: 'calendarFloat 5s ease-in-out infinite',
            filter: 'contrast(1.2) brightness(1.05)'
          }}
        />
      )}

      <div style={{ marginBottom: '32px', position: 'relative', zIndex: 1, marginLeft: '10px' }}>
        <div className="handwritten" style={{ fontSize: '32px' }}>
          {getTodayFormatted()}
        </div>
      </div>

      {/* Filter + Add toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        <FilterDropdown
          value={cityFilter}
          onChange={setCityFilter}
          options={[
            { value: 'all', label: 'All Cities' },
            ...CITY_OPTIONS.map(c => ({ value: c, label: c }))
          ]}
        />
        <button
          onClick={openAddModal}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Plus size={18} weight="duotone" color="#622722" />
        </button>
      </div>

      {filteredActivities.length === 0 ? (
        activities.length === 0 ? (
          <EmptyStateFantom />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
            {`No activities in ${cityFilter}.`}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              poster={profiles[activity.user_id]}
              interestedUsers={getInterestedUsers(activity.id)}
              isUserInterested={isUserInterested(activity.id)}
              isOwner={activity.user_id === profile.id}
              onToggleInterest={toggleInterest}
              onEdit={openEditModal}
              onDelete={handleDelete}
              isPast={false}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
        <Link to="/todo/past" style={{ color: '#999', fontSize: '12px', textDecoration: 'none' }}>
          View past activities
        </Link>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              background: '#FFFEFA',
              borderRadius: '3px',
              padding: '14px',
              maxWidth: '400px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => { e.stopPropagation(); setCityDropdownOpen(false) }}
            className="profile-edit-compact"
          >
            <h2 className="handwritten" style={{ fontSize: '22px', marginBottom: '10px', marginTop: 0, textAlign: 'center' }}>
              {editingActivity ? 'Edit Activity' : 'Add Activity'}
            </h2>

            <form onSubmit={handleSave}>
              {/* Image section */}
              <div className="form-group">
                <label className="form-label">Image</label>
                {imageUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={imageUrl}
                      alt=""
                      style={{ width: '80px', height: '80px', borderRadius: '4px', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#C75D5D',
                        textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCoverSearch(true)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontFamily: "'Source Serif 4', Georgia, serif",
                      background: '#FFFEFA',
                      color: '#622722',
                      border: '1px solid #D4C9B8',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Add image
                  </button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={300}
                  placeholder="e.g., Pottery class in Brooklyn"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="text"
                  value={dateText}
                  onChange={(e) => setDateText(e.target.value)}
                  maxLength={100}
                  placeholder="e.g., February, Feb 14, anytime"
                />
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">City</label>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCityDropdownOpen(!cityDropdownOpen) }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    background: '#FFFEFA',
                    fontSize: '16px',
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    fontStyle: 'italic',
                    fontWeight: 400,
                    color: city ? '#2C2C2C' : '#999',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  {city || 'Select city'}
                  <span style={{ fontSize: '10px', color: '#999' }}>▾</span>
                </button>
                {cityDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#FFFEFA',
                    borderRadius: '0 0 4px 4px',
                    boxShadow: '2px 3px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 10,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {['', ...CITY_OPTIONS].map((opt) => (
                      <div
                        key={opt}
                        onClick={() => { setCity(opt); setCityDropdownOpen(false) }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontFamily: "'Source Serif 4', Georgia, serif",
                          fontSize: '15px',
                          fontStyle: 'italic',
                          color: opt ? '#2C2C2C' : '#999',
                          background: opt === city ? '#F5F0EB' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F0EB' }}
                        onMouseLeave={(e) => { if (opt !== city) e.currentTarget.style.background = 'transparent' }}
                      >
                        {opt || 'Select city'}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={200}
                  placeholder="e.g., Brooklyn, Manhattan"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Price</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  maxLength={50}
                  placeholder="e.g., Free, $45"
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="primary" style={{ flex: 1 }}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cover search modal for image upload */}
      {showCoverSearch && (
        <CoverSearchModal
          isOpen={showCoverSearch}
          onClose={() => setShowCoverSearch(false)}
          onSelect={(result) => {
            setImageUrl(result.imageUrl)
            setShowCoverSearch(false)
          }}
        />
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
