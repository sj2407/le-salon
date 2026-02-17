import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateNewsletter } from '../lib/newsletterGenerator'
import { getWeekLabel } from '../lib/newsletterUtils'

export const Newsletter = () => {
  const { profile } = useAuth()
  const [newsletters, setNewsletters] = useState([])
  const [newsletterItems, setNewsletterItems] = useState({})
  const [friendProfiles, setFriendProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const hasGenerated = useRef(false)

  useEffect(() => {
    if (profile && !hasGenerated.current) {
      hasGenerated.current = true
      checkOrGenerateNewsletter()
    }
  }, [profile])

  const checkOrGenerateNewsletter = async () => {
    try {
      // Generate newsletter if needed (handles all logic internally)
      await generateNewsletter(profile.id)
    } catch (_err) {
      // silently handled
    }
    // Always fetch newsletters, even if generation failed
    await fetchNewsletters()
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

      // Mark all unread as read (fire-and-forget, don't block UI) + fetch items in parallel
      const newsletterIds = newslettersData.map(n => n.id)
      const unreadIds = newslettersData.filter(n => !n.read).map(n => n.id)

      const markReadPromise = unreadIds.length > 0
        ? supabase.from('newsletters').update({ read: true }).in('id', unreadIds)
        : Promise.resolve()

      const [, itemsResult] = await Promise.all([
        markReadPromise,
        supabase.from('newsletter_items').select('*').in('newsletter_id', newsletterIds).order('display_order')
      ])

      if (itemsResult.error) throw itemsResult.error
      const itemsData = itemsResult.data

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

      // Filter out newsletters with no items
      const newslettersWithItems = newslettersData.filter(n =>
        itemsByNewsletter[n.id] && itemsByNewsletter[n.id].length > 0
      )

      setNewsletters(newslettersWithItems)
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
    } catch (_err) {
      // silently handled
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
      <div className="container" style={{ maxWidth: '720px', position: 'relative' }}>
        {/* Cactus collage */}
        <img
          src="/images/cactus-ready.png"
          alt=""
          style={{
            position: 'absolute',
            top: '8px',
            right: '15%',
            width: '50px',
            height: 'auto',
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 0,
            animation: 'bookFloat 5s ease-in-out infinite',
            transformOrigin: 'bottom center'
          }}
        />
        <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '24px', marginTop: '8px', marginLeft: '10px', position: 'relative', zIndex: 1 }}>
          Newsletter
        </h1>
        <div style={{
          background: '#FFFEFA',
          borderRadius: '3px',
          padding: '48px 32px',
          textAlign: 'center',
          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ fontSize: '16px', color: '#666', margin: 0, fontStyle: 'italic' }}>
            No updates from your friends yet. Check back later!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '720px', position: 'relative' }}>
      {/* Cactus collage */}
      <img
        src="/images/cactus-ready.png"
        alt=""
        style={{
          position: 'absolute',
          top: '8px',
          right: '15%',
          width: '50px',
          height: 'auto',
          opacity: 0.7,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'bookFloat 5s ease-in-out infinite',
          transformOrigin: 'bottom center'
        }}
      />

      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '24px', marginTop: '8px', marginLeft: '10px', position: 'relative', zIndex: 1 }}>
        Newsletter
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {newsletters.map((newsletter, index) => {
          const items = newsletterItems[newsletter.id] || []
          const itemsByFriend = groupItemsByFriend(items)
          const isLatest = index === 0

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
                {getWeekLabel(newsletter.period_end, isLatest)}
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
