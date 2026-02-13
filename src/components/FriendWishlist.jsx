import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { WishlistDisplay } from './WishlistDisplay'

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
      const item = items.find(i => i.id === itemId)

      const { error } = await supabase
        .from('wishlist_items')
        .update({
          claimed_by: profile.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error

      // Create anonymous notification for wishlist owner
      if (item) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: item.user_id,
            type: 'wishlist_claimed',
            actor_id: profile.id,
            reference_id: itemId,
            reference_name: item.name,
            message: `Someone claimed ${item.name} from your wishlist`
          })

        if (notifError) {
          console.error('Notification insert failed:', notifError)
        }
      }

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
    <WishlistDisplay
      items={items}
      title={`${friendName}'s Wishlist`}
      emptyMessage={`${friendName} hasn't added anything yet...`}
      renderItemStatus={(item) => {
        const isClaimedByMe = item.claimed_by === profile.id
        const isClaimedByOther = item.claimed_by && !isClaimedByMe

        if (isClaimedByMe) {
          return (
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
          )
        }

        if (isClaimedByOther) {
          return (
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
          )
        }

        return null
      }}
      renderItemActions={(item) => {
        const isClaimedByMe = item.claimed_by === profile.id

        if (!item.claimed_by) {
          return (
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
          )
        }

        if (isClaimedByMe) {
          return (
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
          )
        }

        return null
      }}
    />
  )
}
