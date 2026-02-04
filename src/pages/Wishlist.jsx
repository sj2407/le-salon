import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const Wishlist = () => {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      fetchWishlistItems()
    }
  }, [profile])

  const fetchWishlistItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching wishlist:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setName('')
    setType('')
    setLink('')
    setError('')
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setName(item.name)
    setType(item.type || '')
    setLink(item.link || '')
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('wishlist_items')
          .update({
            name,
            type: type.trim() || null,
            link: link.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id)

        if (error) throw error
      } else {
        // Create new item
        const { error } = await supabase
          .from('wishlist_items')
          .insert({
            user_id: profile.id,
            name,
            type: type.trim() || null,
            link: link.trim() || null
          })

        if (error) throw error
      }

      setShowModal(false)
      fetchWishlistItems()
    } catch (err) {
      console.error('Error saving item:', err)
      setError(err.message)
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this item from your wishlist?')) return

    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      fetchWishlistItems()
    } catch (err) {
      console.error('Error deleting item:', err)
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
    <div className="container" style={{ maxWidth: '720px', position: 'relative' }}>
      {/* Gift box collage */}
      <img
        src="/images/gift-ready.png"
        alt=""
        style={{
          position: 'absolute',
          top: '5px',
          left: '200px',
          width: '80px',
          height: 'auto',
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'bookFloat 4.5s ease-in-out infinite',
          filter: 'contrast(1.3) brightness(1.1)'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', position: 'relative', zIndex: 1 }}>
        <h1 className="handwritten" style={{ fontSize: '42px', margin: 0 }}>
          Wishlist
        </h1>
        <button onClick={openAddModal} style={{
          background: 'none',
          border: 'none',
          fontFamily: 'Caveat, cursive',
          fontSize: '20px',
          color: '#4A7BA7',
          cursor: 'pointer',
          fontWeight: 'bold',
          padding: 0
        }}>
          + Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          Nothing on your wishlist yet...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((item, index) => (
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
                <div style={{ marginTop: '4px', fontSize: '13px' }}>
                  {item.claimed_by ? (
                    <span style={{
                      color: '#4CAF50',
                      fontWeight: 600,
                      background: 'rgba(76, 175, 80, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      Claimed ✓
                    </span>
                  ) : (
                    <span style={{ color: '#999' }}>Available</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => openEditModal(item)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '16px',
                    opacity: 0.4,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.4'}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: 0.6,
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.6'}
                  title="Delete"
                >
                  <img
                    src="/images/eraser.jpeg"
                    alt="Delete"
                    style={{
                      width: '24px',
                      height: '24px',
                      objectFit: 'contain'
                    }}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
              {editingItem ? 'Edit Item' : 'Add Item'}
            </h2>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g., Ceramic mug, Book title, etc."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type (optional)</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="e.g., Book, Movie, Album, etc."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Link (optional)</label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
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
