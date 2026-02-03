import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

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

  useEffect(() => {
    if (profile) {
      autoArchiveActivities().then(() => {
        fetchActivities()
      })
    }
  }, [profile])

  const autoArchiveActivities = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      await supabase
        .from('activities')
        .update({ is_archived: true })
        .lt('date_parsed', today)
        .eq('is_archived', false)
    } catch (err) {
      console.error('Error auto-archiving:', err)
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
    } catch (err) {
      console.error('Error fetching activities:', err)
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
      console.error('Error saving activity:', err)
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
    } catch (err) {
      console.error('Error deleting activity:', err)
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
      }

      fetchActivities()
    } catch (err) {
      console.error('Error toggling interest:', err)
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
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const today = new Date()
    return `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`
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
    <div className="container" style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="handwritten" style={{ fontSize: '32px' }}>
          {getTodayFormatted()}
        </div>
        <button onClick={openAddModal} className="primary">
          Add Activity
        </button>
      </div>

      {/* City filter */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '14px', fontWeight: 600, marginRight: '8px' }}>Filter by city:</label>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            border: '1.5px solid #2C2C2C',
            borderRadius: '3px',
            background: '#FFFEFA',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Cities</option>
          {CITY_OPTIONS.map((cityOption) => (
            <option key={cityOption} value={cityOption}>
              {cityOption}
            </option>
          ))}
        </select>
      </div>

      {filteredActivities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          {activities.length === 0
            ? 'No activities yet. Add something fun to do with friends!'
            : `No activities in ${cityFilter}.`}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#FFFEFA',
              border: '2px solid #2C2C2C',
              borderRadius: '4px',
              boxShadow: '4px 4px 0 #2C2C2C'
            }}
          >
            <thead>
              <tr style={{ background: '#F5F1EB', borderBottom: '2px solid #2C2C2C' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '120px' }}>
                  Friend
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '200px' }}>
                  Activity
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '100px' }}>
                  Date
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '100px' }}>
                  City
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '120px' }}>
                  Location
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderRight: '1px solid #E8E8E8', minWidth: '80px' }}>
                  Price
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, minWidth: '150px' }}>
                  Interested
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((activity, index) => {
                const poster = profiles[activity.user_id]
                const interestedInitials = getInterestedInitials(activity.id)
                const userIsInterested = isUserInterested(activity.id)

                return (
                  <tr key={activity.id} style={{ borderBottom: index < filteredActivities.length - 1 ? '1px solid #E8E8E8' : 'none' }}>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      <Link to={`/friend/${activity.user_id}`} style={{ color: '#4A7BA7', textDecoration: 'underline' }}>
                        {poster?.display_name || 'Unknown'}
                      </Link>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', fontStyle: 'italic', borderRight: '1px solid #E8E8E8' }}>
                      {activity.description}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {activity.date_text || '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {activity.city || '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {activity.location || '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', borderRight: '1px solid #E8E8E8' }}>
                      {activity.price || '—'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {interestedInitials.length > 0 && (
                          <span style={{ color: '#777', fontSize: '13px' }}>
                            {interestedInitials.join(' ')}
                          </span>
                        )}
                        <button
                          onClick={() => toggleInterest(activity.id)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '14px',
                            background: userIsInterested ? '#D0E0D0' : '#FFFEFA',
                            border: '1.5px solid #2C2C2C',
                            borderRadius: '3px',
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
                                padding: '4px',
                                fontSize: '16px',
                                opacity: 0.5,
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.opacity = '1'}
                              onMouseLeave={(e) => e.target.style.opacity = '0.5'}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(activity.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                fontSize: '16px',
                                opacity: 0.5,
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.opacity = '1'}
                              onMouseLeave={(e) => e.target.style.opacity = '0.5'}
                              title="Delete"
                            >
                              🗑️
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
      )}

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link to="/todo/past" style={{ color: '#4A7BA7', fontSize: '14px', textDecoration: 'underline' }}>
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
          onClick={() => setShowModal(false)}
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
                  placeholder="e.g., Pottery class in Brooklyn"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="text"
                  value={dateText}
                  onChange={(e) => setDateText(e.target.value)}
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
                  placeholder="e.g., Brooklyn, Manhattan"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Price</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
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
