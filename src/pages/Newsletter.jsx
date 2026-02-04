import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateNewsletter } from '../lib/newsletterGenerator'
import { getCurrentWeekPeriod, getWeekLabel } from '../lib/newsletterUtils'

export const Newsletter = () => {
  const { profile } = useAuth()
  const [newsletters, setNewsletters] = useState([])
  const [newsletterItems, setNewsletterItems] = useState({})
  const [friendProfiles, setFriendProfiles] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      checkOrGenerateNewsletter()
    }
  }, [profile])

  const checkOrGenerateNewsletter = async () => {
    try {
      const { periodStart, periodEnd } = getCurrentWeekPeriod()

      // Check if newsletter exists for this week by period_start (stable identifier)
      const { data: existing, error: checkError } = await supabase
        .from('newsletters')
        .select('*')
        .eq('user_id', profile.id)
        .eq('period_start', periodStart)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (!existing) {
        // Generate new newsletter for this period
        await generateNewsletter(profile.id, periodStart, periodEnd)
      }

      // Fetch all newsletters and mark current one as read
      await fetchNewsletters()
    } catch (err) {
      console.error('Error checking/generating newsletter:', err)
      setLoading(false)
    }
  }

  const fetchNewsletters = async () => {
    try {
      setLoading(true)

      // Fetch all newsletters for user
      const { data: newslettersData, error: newslettersError } = await supabase
        .from('newsletters')
        .select('*')
        .eq('user_id', profile.id)
        .order('period_end', { ascending: false })

      if (newslettersError) throw newslettersError

      if (!newslettersData || newslettersData.length === 0) {
        setNewsletters([])
        setLoading(false)
        return
      }

      setNewsletters(newslettersData)

      // Mark the most recent newsletter as read
      const latestNewsletter = newslettersData[0]
      if (!latestNewsletter.read) {
        await supabase
          .from('newsletters')
          .update({ read: true })
          .eq('id', latestNewsletter.id)
      }

      // Fetch items for all newsletters
      const newsletterIds = newslettersData.map(n => n.id)
      const { data: itemsData, error: itemsError } = await supabase
        .from('newsletter_items')
        .select('*')
        .in('newsletter_id', newsletterIds)
        .order('display_order')

      if (itemsError) throw itemsError

      // Group items by newsletter_id
      const itemsByNewsletter = {}
      if (itemsData) {
        itemsData.forEach(item => {
          if (!itemsByNewsletter[item.newsletter_id]) {
            itemsByNewsletter[item.newsletter_id] = []
          }
          itemsByNewsletter[item.newsletter_id].push(item)
        })
      }

      setNewsletterItems(itemsByNewsletter)

      // Fetch friend profiles
      const friendIds = [...new Set(itemsData?.map(item => item.friend_id) || [])]
      if (friendIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, profile_photo_url')
          .in('id', friendIds)

        if (profilesError) throw profilesError

        const profilesMap = {}
        profilesData?.forEach(p => {
          profilesMap[p.id] = p
        })
        setFriendProfiles(profilesMap)
      }
    } catch (err) {
      console.error('Error fetching newsletters:', err)
    } finally {
      setLoading(false)
    }
  }

  const groupItemsByFriend = (items) => {
    const grouped = {}
    items.forEach(item => {
      if (!grouped[item.friend_id]) {
        grouped[item.friend_id] = []
      }
      grouped[item.friend_id].push(item)
    })
    return grouped
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading newsletters...</div>
      </div>
    )
  }

  if (newsletters.length === 0) {
    return (
      <div className="container" style={{ maxWidth: '720px' }}>
        <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px' }}>
          Newsletter
        </h1>
        <div style={{
          background: '#FFFEFA',
          border: '1.5px solid #2C2C2C',
          borderRadius: '3px',
          padding: '48px 32px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
            Add friends to see their weekly updates here!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px' }}>
        Newsletter
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {newsletters.map((newsletter) => {
          const items = newsletterItems[newsletter.id] || []
          const itemsByFriend = groupItemsByFriend(items)

          return (
            <section key={newsletter.id}>
              <h2 style={{
                fontSize: '20px',
                marginBottom: '24px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#666',
                fontWeight: 600
              }}>
                {getWeekLabel(newsletter.period_end)}
              </h2>

              {items.length === 0 ? (
                <div style={{
                  background: '#FFFEFA',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '32px 24px',
                  textAlign: 'center',
                  boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                  fontStyle: 'italic',
                  color: '#999'
                }}>
                  Your friends were quiet this week
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {Object.entries(itemsByFriend).map(([friendId, friendItems]) => {
                    const friendProfile = friendProfiles[friendId]
                    if (!friendProfile) return null

                    return (
                      <div
                        key={friendId}
                        style={{
                          background: '#FFFEFA',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '20px 24px',
                          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        {/* Friend Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '16px',
                          paddingBottom: '12px',
                          borderBottom: '1px dashed #E0E0E0'
                        }}>
                          {friendProfile.profile_photo_url && (
                            <img
                              src={friendProfile.profile_photo_url}
                              alt={friendProfile.display_name}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid #2C2C2C'
                              }}
                            />
                          )}
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            margin: 0,
                            color: '#2C2C2C'
                          }}>
                            {friendProfile.display_name}
                          </h3>
                        </div>

                        {/* Friend Activity Items */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {friendItems.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                fontSize: '15px',
                                lineHeight: 1.5,
                                color: '#2C2C2C',
                                paddingLeft: '8px'
                              }}
                            >
                              <span style={{ color: '#999', marginRight: '8px' }}>—</span>
                              {item.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
