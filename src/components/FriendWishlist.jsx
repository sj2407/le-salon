import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const FriendWishlist = ({ friendId, friendName }) => {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && friendId) {
      fetchWishlistItems()
    }
  }, [profile, friendId])

  const fetchWishlistItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', friendId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching friend wishlist:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (itemId) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .update({
          claimed_by: profile.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error
      fetchWishlistItems()
    } catch (err) {
      console.error('Error claiming item:', err)
    }
  }

  const handleUnclaim = async (itemId) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .update({
          claimed_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error
      fetchWishlistItems()
    } catch (err) {
      console.error('Error unclaiming item:', err)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading wishlist...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px' }}>
        {friendName}'s Wishlist
      </h1>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          {friendName} hasn't added anything yet...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item, index) => {
            const isClaimedByMe = item.claimed_by === profile.id
            const isClaimedByOther = item.claimed_by && !isClaimedByMe

            return (
              <div
                key={item.id}
                style={{
                  background: '#FFFEFA',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '16px',
                  boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                  transform: `rotate(${index % 2 === 0 ? '-0.3' : '0.3'}deg)`,
                  animation: `reviewSway${(index % 3) + 1} ${5 + index % 2}s ease-in-out infinite`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {item.type && (
                      <span style={{
                        fontSize: '12px',
                        color: '#666',
                        background: '#F5F1EB',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 500
                      }}>
                        {item.type}
                      </span>
                    )}
                  </div>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#4A7BA7',
                        textDecoration: 'underline'
                      }}
                    >
                      {item.name}
                    </a>
                  ) : (
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{item.name}</div>
                  )}
                </div>

                <div style={{ marginLeft: '16px' }}>
                  {!item.claimed_by && (
                    <button
                      onClick={() => handleClaim(item.id)}
                      style={{
                        background: '#4A7BA7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '6px 16px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      Claim
                    </button>
                  )}

                  {isClaimedByMe && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{
                        color: '#4CAF50',
                        fontWeight: 600,
                        fontSize: '13px',
                        background: 'rgba(76, 175, 80, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        Claimed by you ✓
                      </span>
                      <button
                        onClick={() => handleUnclaim(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#999',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0
                        }}
                      >
                        Unclaim
                      </button>
                    </div>
                  )}

                  {isClaimedByOther && (
                    <span style={{
                      color: '#999',
                      fontWeight: 600,
                      fontSize: '13px',
                      background: 'rgba(0, 0, 0, 0.05)',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      Claimed ✓
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
