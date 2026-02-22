import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { WishlistDisplay } from '../components/WishlistDisplay'
import { CoverSearchModal } from '../components/cover-search/CoverSearchModal'
import { CoverThumbnail } from '../components/cover-search/CoverThumbnail'
import { typeToMediaType } from '../lib/coverSearchApis'

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
  const [imageUrl, setImageUrl] = useState('')
  const [showCoverSearch, setShowCoverSearch] = useState(false)

  // Track initial form values to detect dirty state
  const initialFormRef = useRef(null)

  useEffect(() => {
    if (profile) {
      fetchWishlistItems()
    }
  }, [profile])

  const isFormDirty = () => {
    if (!initialFormRef.current) return false
    const init = initialFormRef.current
    return name !== init.name || type !== init.type || link !== init.link
  }

  // Escape key handler for modal - only close if form is clean
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal && !isFormDirty()) setShowModal(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showModal, name, type, link])

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
    } catch (_err) {
      // silently handled
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
    setImageUrl('')
    initialFormRef.current = { name: '', type: '', link: '' }
    setShowModal(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setName(item.name)
    setType(item.type || '')
    setLink(item.link || '')
    setError('')
    setImageUrl(item.image_url || '')
    initialFormRef.current = { name: item.name, type: item.type || '', link: item.link || '' }
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const trimmedLink = link.trim() || null

      if (editingItem) {
        const { error } = await supabase
          .from('wishlist_items')
          .update({
            name,
            type: type.trim() || null,
            link: trimmedLink,
            image_url: imageUrl || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('wishlist_items')
          .insert({
            user_id: profile.id,
            name,
            type: type.trim() || null,
            link: trimmedLink,
            image_url: imageUrl || null
          })

        if (error) throw error
      }

      document.activeElement?.blur()
      setShowModal(false)
      fetchWishlistItems()
      setTimeout(() => window.scrollTo(0, window.scrollY), 50)
    } catch (err) {
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
    } catch (_err) {
      // silently handled
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
    <>
      <WishlistDisplay
        items={items}
        title="My Wishlist"
        emptyMessage="Nothing on your wishlist yet..."
        description="Add items you'd like, and friends can anonymously claim them as gifts for you."
        renderHeaderActions={() => (
          <button onClick={openAddModal} style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: '#8C8578',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1
          }}>
            +
          </button>
        )}
        renderItemStatus={(item) => (
          <span style={{ fontSize: '13px' }}>
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
          </span>
        )}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <CoverSearchModal
        isOpen={showCoverSearch}
        onClose={() => setShowCoverSearch(false)}
        onSelect={({ imageUrl: url }) => setImageUrl(url)}
        initialQuery={name}
        mediaType={typeToMediaType(type)}
      />

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
              border: 'none',
              borderRadius: '8px',
              padding: '20px 24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="handwritten" style={{ fontSize: '24px', marginBottom: '16px' }}>
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

              {type.trim() && (
                <div className="form-group">
                  <label className="form-label">Cover Image (optional)</label>
                  {imageUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CoverThumbnail imageUrl={imageUrl} tag={typeToMediaType(type) || 'other'} size="medium" />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {typeToMediaType(type) && (
                          <button
                            type="button"
                            onClick={() => setShowCoverSearch(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#4A7BA7', padding: '4px 0' }}
                          >
                            Change
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#999', padding: '4px 0' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : typeToMediaType(type) ? (
                    <button
                      type="button"
                      onClick={() => setShowCoverSearch(true)}
                      style={{
                        background: 'none',
                        border: '1px dashed #ccc',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#999',
                        fontStyle: 'italic',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      Search cover...
                    </button>
                  ) : (
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '16px',
                        fontStyle: 'italic',
                        boxSizing: 'border-box',
                        background: '#FFFEFA'
                      }}
                    />
                  )}
                </div>
              )}

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
    </>
  )
}
