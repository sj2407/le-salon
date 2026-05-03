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

  return (
    <div style={{ maxWidth: '720px', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 160px)' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '0', marginTop: '8px', marginLeft: '10px', transform: 'translateY(16px)', color: '#2C2C2C' }}>
        {friendName ? `${friendName}'s Liste` : 'La Liste'}
      </h1>
      <p style={{
        fontFamily: "'Source Serif 4', Georgia, serif",
        fontStyle: 'italic',
        fontSize: '13px',
        color: '#999',
        marginTop: '20px',
        marginBottom: '12px',
        marginLeft: '10px',
      }}>
        Everything {friendName ? `${friendName} wants` : 'I want'} to read, watch, listen to, and experience
      </p>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', fontStyle: 'italic', color: '#999' }}>
          {friendName || 'This friend'} hasn't added anything to their liste yet...
        </div>
      ) : (
        <CoverflowCarousel
          items={items.map(i => ({
            id: i.id,
            imageUrl: i.image_url,
            title: i.title,
            tag: i.tag,
          }))}
        />
      )}
    </div>
  )
}
