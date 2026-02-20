import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { EmptyStateFantom } from '../components/EmptyStateFantom'
import { FilterDropdown } from '../components/FilterDropdown'

// Parse date_text into date_parsed
const parseDate = (dateText) => {
  if (!dateText || dateText.toLowerCase().includes('anytime')) {
    return null
  }

  const text = dateText.trim()

  // Try specific date formats: "Feb 14, 2026" or "February 14, 2026"
  const specificDateMatch = text.match(/(\w+)\s+(\d+),?\s+(\d{4})/)
  if (specificDateMatch) {
    const [, month, day, year] = specificDateMatch
    const date = new Date(`${month} ${day}, ${year}`)
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
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

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
      city !== init.city || location !== init.location || price !== init.price
  }

  // Escape key handler for modal - only close if form is clean
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal && !isFormDirty()) setShowModal(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showModal, description, dateText, city, location, price])

  const autoArchiveActivities = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      await supabase
        .from('activities')
        .update({ is_archived: true })
        .lt('date_parsed', today)
        .eq('is_archived', false)
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
        .select('id, display_name, username')
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
      // silently handled
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
    setError('')
    initialFormRef.current = { description: '', dateText: '', city: '', location: '', price: '' }
    setShowModal(true)
  }

  const openEditModal = (activity) => {
    setEditingActivity(activity)
    setDescription(activity.description)
    setDateText(activity.date_text || '')
    setCity(activity.city || '')
    setLocation(activity.location || '')
    setPrice(activity.price || '')
    setError('')
    initialFormRef.current = {
      description: activity.description,
      dateText: activity.date_text || '',
      city: activity.city || '',
      location: activity.location || '',
      price: activity.price || ''
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
            price: price.trim() || null
          })

        if (error) throw error
      }

      setShowModal(false)
      fetchActivities()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (activityId) => {
    if (!confirm('Delete this activity?')) return

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId)

      if (error) throw error
      fetchActivities()
    } catch (_err) {
      // silently handled
    }
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
      // silently handled
    }
  }

  const getInterestedInitials = (activityId) => {
    const activityInterests = interests[activityId] || []
    return activityInterests
      .map((interest) => {
        const user = profiles[interest.user_id]
        return user ? user.username.substring(0, 3) : ''
      })
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
    <div className="container" style={{ maxWidth: '900px', position: 'relative' }}>
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
            fontSize: '20px',
            color: '#8C8578',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1
          }}
        >
          +
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
        <div className="activity-board-note" style={{ position: 'relative' }}>

          <div style={{ overflowX: 'auto' }}>
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Friend</th>
                  <th>Activity</th>
                  <th>Date</th>
                  <th>City</th>
                  <th>Location</th>
                  <th>Price</th>
                  <th>Interested</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => {
                  const poster = profiles[activity.user_id]
                  const interestedInitials = getInterestedInitials(activity.id)
                  const userIsInterested = isUserInterested(activity.id)

                  return (
                    <tr key={activity.id}>
                      <td>
                        <Link to={`/friend/${activity.user_id}`} style={{ color: '#4A7BA7', textDecoration: 'underline' }}>
                          {poster?.display_name || 'Unknown'}
                        </Link>
                      </td>
                      <td style={{ fontStyle: 'italic' }}>{activity.description}</td>
                      <td>{activity.date_text || '—'}</td>
                      <td>{activity.city || '—'}</td>
                      <td>{activity.location || '—'}</td>
                      <td>{activity.price || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {interestedInitials.length > 0 && (
                            <span style={{ color: '#777', fontSize: '12px' }}>
                              {interestedInitials.join(' ')}
                            </span>
                          )}
                          <button
                            onClick={() => toggleInterest(activity.id)}
                            style={{
                              padding: '3px 8px',
                              fontSize: '12px',
                              background: userIsInterested ? '#D0E0D0' : '#FFFEFA',
                              border: '1px solid #C0C0C0',
                              borderRadius: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            {userIsInterested ? '✓' : '+'}
                          </button>
                          {activity.user_id === profile.id && (
                            <>
                              <button
                                onClick={() => openEditModal(activity)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  fontSize: '14px',
                                  opacity: 0.5
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '1'}
                                onMouseLeave={(e) => e.target.style.opacity = '0.5'}
                              >
                                <img src="/images/quill-ready.png" alt="Edit" style={{ width: '29px', height: '29px', objectFit: 'contain' }} />
                              </button>
                              <button
                                onClick={() => handleDelete(activity.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  opacity: 0.6,
                                  display: 'flex'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '1'}
                                onMouseLeave={(e) => e.target.style.opacity = '0.6'}
                              >
                                <img src="/images/eraser.jpeg" alt="Delete" style={{ width: '18px', height: '18px', objectFit: 'contain', transform: 'rotate(60deg)' }} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
          onClick={() => { if (!isFormDirty()) setShowModal(false) }}
        >
          <div
            style={{
              background: '#FFFEFA',
              border: '2px solid #2C2C2C',
              borderRadius: '4px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '4px 4px 0 #2C2C2C'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '24px' }}>
              {editingActivity ? 'Edit Activity' : 'Add Activity'}
            </h2>

            <form onSubmit={handleSave}>
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

              <div className="form-group">
                <label className="form-label">City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    background: '#FFFEFA',
                    fontSize: '15px',
                    fontFamily: 'Source Serif 4, Georgia, serif'
                  }}
                >
                  <option value="">Select city</option>
                  {CITY_OPTIONS.map((cityOption) => (
                    <option key={cityOption} value={cityOption}>
                      {cityOption}
                    </option>
                  ))}
                </select>
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
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
    </div>
  )
}
