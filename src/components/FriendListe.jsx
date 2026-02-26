import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CoverflowCarousel } from './CoverflowCarousel'

export const FriendListe = ({ friendId, friendName }) => {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && friendId) fetchItems()
  }, [profile, friendId])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('discovery_items')
        .select('*')
        .eq('user_id', friendId)
        .eq('is_private', false)
        .eq('is_done', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', fontStyle: 'italic', color: '#999' }}>
        {friendName || 'This friend'} hasn't added anything to their liste yet...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <CoverflowCarousel
        items={items.map(i => ({
          id: i.id,
          imageUrl: i.image_url,
          title: i.title,
          tag: i.tag,
        }))}
      />
    </div>
  )
}
