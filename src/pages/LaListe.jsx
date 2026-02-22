import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { TAG_ICONS, TAG_OPTIONS, TAG_LABELS } from '../lib/reviewConstants'
import { TagAutocomplete } from '../components/TagAutocomplete'
import { EmptyStateFantom } from '../components/EmptyStateFantom'
import { FilterDropdown } from '../components/FilterDropdown'
import { DictationModal } from '../components/DictationModal'
import { scrollLock } from '../lib/scrollLock'
import { isSpeechSupported } from '../lib/useSpeechRecognition'
import { CoverSearchModal } from '../components/cover-search/CoverSearchModal'
import { CoverThumbnail } from '../components/cover-search/CoverThumbnail'
import { TAG_TO_MEDIA_TYPE } from '../lib/coverSearchApis'

export const LaListe = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTag, setFilterTag] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [recsExpanded, setRecsExpanded] = useState(false)
  const [expandedRecs, setExpandedRecs] = useState(new Set())
  const [showDictation, setShowDictation] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  // Add/edit form state
  const [newTitle, setNewTitle] = useState('')
  const [newTag, setNewTag] = useState('other')
  const [newNote, setNewNote] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTag, setEditTag] = useState('other')
  const [editNote, setEditNote] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [showCoverSearch, setShowCoverSearch] = useState(false)
  const [coverSearchContext, setCoverSearchContext] = useState('add') // 'add' or 'edit'

  useEffect(() => {
    if (profile) {
      fetchItems()
      fetchRecommendations()
    }
  }, [profile])

  // Close menu on click outside or Escape
  useEffect(() => {
    if (openMenuId === null) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openMenuId])

  // Lock body scroll while any form is active (prevents iOS keyboard viewport shift)
  useEffect(() => {
    if (showAddForm || editingId) scrollLock.enable()
    else scrollLock.disable()
    return () => scrollLock.disable()
  }, [showAddForm, editingId])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('discovery_items')
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

  const fetchRecommendations = async () => {
    try {
      const { data: recsData, error: recsError } = await supabase
        .from('review_recommendations')
        .select('review_id')
        .eq('recommended_to_user_id', profile.id)

      if (recsError) throw recsError
      if (!recsData || recsData.length === 0) {
        setRecommendations([])
        return
      }

      const reviewIds = recsData.map(r => r.review_id)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`*, profiles!reviews_user_id_fkey(display_name)`)
        .in('id', reviewIds)
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError
      setRecommendations(reviewsData || [])
    } catch (_err) {
      // silently handled
    }
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return

    try {
      const { error } = await supabase
        .from('discovery_items')
        .insert({
          user_id: profile.id,
          title: newTitle.trim(),
          tag: newTag,
          note: newNote.trim() || null,
          item_date: newDate || null,
          image_url: newImageUrl || null
        })

      if (error) throw error

      setNewTitle('')
      setNewTag('other')
      setNewNote('')
      setNewDate('')
      setNewImageUrl('')
      setShowAddForm(false)
      await fetchItems()
    } catch (_err) {
      alert('Could not add item. Please try again.')
    }
  }

  const handleToggleDone = async (item) => {
    try {
      const { error } = await supabase
        .from('discovery_items')
        .update({
          is_done: !item.is_done,
          done_at: !item.is_done ? new Date().toISOString() : null
        })
        .eq('id', item.id)

      if (error) throw error
      await fetchItems()
    } catch (_err) {
      // silently handled
    }
  }

  const handleDelete = async (itemId) => {
    try {
      const { error } = await supabase
        .from('discovery_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      await fetchItems()
    } catch (_err) {
      // silently handled
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setEditTag(item.tag)
    setEditNote(item.note || '')
    setEditDate(item.item_date || '')
    setEditImageUrl(item.image_url || '')
  }

  const handleEdit = async () => {
    if (!editTitle.trim()) return

    try {
      const { error } = await supabase
        .from('discovery_items')
        .update({
          title: editTitle.trim(),
          tag: editTag,
          note: editNote.trim() || null,
          item_date: editDate || null,
          image_url: editImageUrl || null
        })
        .eq('id', editingId)

      if (error) throw error

      setEditingId(null)
      await fetchItems()
    } catch (_err) {
      // silently handled
    }
  }

  const handleAdoptRec = async (review) => {
    try {
      const { error } = await supabase
        .from('discovery_items')
        .insert({
          user_id: profile.id,
          title: review.title,
          tag: review.tag,
          note: `Recommended by ${review.profiles?.display_name || 'a friend'}`
        })

      if (error) throw error
      await fetchItems()
    } catch (_err) {
      alert('Could not add to your list. Please try again.')
    }
  }

  const handleWriteReview = (item) => {
    const params = new URLSearchParams({
      tab: 'reviews',
      prefill_title: item.title,
      prefill_tag: item.tag
    })
    navigate(`/my-corner?${params.toString()}`)
  }

  const toggleRecExpanded = (reviewId) => {
    const newExpanded = new Set(expandedRecs)
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId)
    } else {
      newExpanded.add(reviewId)
    }
    setExpandedRecs(newExpanded)
  }

  const handleDictationSave = async (transcript) => {
    const { data, error } = await supabase.functions.invoke('parse-dictation', {
      body: { transcript, context: 'liste' }
    })
    if (error) {
      const detail = data?.error || error.message
      throw new Error(detail)
    }
    if (!data?.entries || data.entries.length === 0) {
      throw new Error("Couldn't identify any items. Try being more specific, e.g. \"I want to watch Dune Part Two\".")
    }

    const rows = data.entries.map(entry => ({
      user_id: profile.id,
      title: entry.title,
      tag: TAG_OPTIONS.includes(entry.tag) ? entry.tag : 'other',
      note: entry.note || null
    }))

    const { error: insertError } = await supabase.from('discovery_items').insert(rows)
    if (insertError) throw insertError
    await fetchItems()
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const sortItems = (list) => {
    if (sortBy === 'oldest') {
      return [...list].reverse()
    }
    return list // already sorted by created_at desc from DB
  }

  const pendingItems = items.filter(i => !i.is_done)
  const doneItems = items.filter(i => i.is_done)
  const filteredPending = sortItems(
    filterTag === 'all'
      ? pendingItems
      : pendingItems.filter(i => i.tag === filterTag)
  )
  const filteredDone = filterTag === 'all'
    ? doneItems
    : doneItems.filter(i => i.tag === filterTag)

  return (
    <div style={{ maxWidth: '720px', position: 'relative' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '0', marginTop: '8px', marginLeft: '10px', position: 'relative', zIndex: 1, transform: 'translateY(16px)' }}>
        La Liste
      </h1>

      {/* Toolbar: filter + sort left, + and mic right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FilterDropdown
            value={filterTag}
            onChange={setFilterTag}
            options={[
              { value: 'all', label: 'All' },
              ...TAG_OPTIONS.map(t => ({ value: t, label: `${TAG_ICONS[t]} ${TAG_LABELS[t]}` }))
            ]}
          />
          <button
            onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#999',
              padding: '4px 0',
              whiteSpace: 'nowrap'
            }}
          >
            {sortBy === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
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
          {isSpeechSupported && (
            <button
              onClick={() => setShowDictation(true)}
              title="Dictate items by voice"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{
          background: '#FFFEFA',
          borderRadius: '2px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What do you want to discover?"
            autoFocus
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '16px',
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontStyle: 'italic',
              background: '#FFFEFA',
              boxSizing: 'border-box',
              marginBottom: '10px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) handleAdd()
              if (e.key === 'Escape') setShowAddForm(false)
            }}
          />
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <TagAutocomplete
              value={newTag}
              onChange={setNewTag}
              style={{ width: '160px' }}
            />
            <input
              type="text"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              placeholder="Date (optional)"
              maxLength={40}
              style={{
                padding: '6px 10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '16px',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontStyle: 'italic',
                background: '#FFFEFA',
                width: '130px'
              }}
            />
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Note (optional)"
              maxLength={280}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '6px 10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '16px',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontStyle: 'italic',
                background: '#FFFEFA'
              }}
            />
          </div>
          {newTag !== 'other' && (
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {newImageUrl ? (
                <>
                  <CoverThumbnail imageUrl={newImageUrl} tag={newTag} />
                  {TAG_TO_MEDIA_TYPE[newTag] && (
                    <button
                      type="button"
                      onClick={() => { setCoverSearchContext('add'); setShowCoverSearch(true) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#4A7BA7', padding: '2px 0' }}
                    >
                      Change
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNewImageUrl('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#999', padding: '2px 0' }}
                  >
                    Remove
                  </button>
                </>
              ) : TAG_TO_MEDIA_TYPE[newTag] ? (
                <button
                  type="button"
                  onClick={() => { setCoverSearchContext('add'); setShowCoverSearch(true) }}
                  style={{
                    background: 'none',
                    border: '1px dashed #ccc',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#999',
                    fontStyle: 'italic'
                  }}
                >
                  Search cover...
                </button>
              ) : (
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    fontSize: '16px',
                    fontStyle: 'italic',
                    background: '#FFFEFA',
                    width: '200px'
                  }}
                />
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              style={{
                padding: '8px 20px',
                background: newTitle.trim() ? '#2C2C2C' : '#ccc',
                color: '#FFF',
                border: 'none',
                borderRadius: '3px',
                fontSize: '14px',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewTitle(''); setNewTag('other'); setNewNote(''); setNewDate(''); setNewImageUrl('') }}
              style={{
                padding: '8px 16px',
                background: '#F5F1EB',
                border: '1px solid #CCC',
                borderRadius: '3px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#555'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending items */}
      {filteredPending.length === 0 && filteredDone.length === 0 && recommendations.length === 0 ? (
        <EmptyStateFantom />
      ) : (
        <>
          {filteredPending.length === 0 && pendingItems.length > 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic', color: '#777' }}>
              No {TAG_LABELS[filterTag] || filterTag} items yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredPending.map((item, index) => (
                editingId === item.id ? (
                  /* Inline edit form */
                  <div
                    key={item.id}
                    style={{
                      background: '#FFFEFA',
                      borderRadius: '2px',
                      padding: '12px 16px',
                      boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '16px',
                        fontFamily: "'Source Serif 4', Georgia, serif",
                        fontStyle: 'italic',
                        background: '#FFFEFA',
                        boxSizing: 'border-box',
                        marginBottom: '8px'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editTitle.trim()) handleEdit()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <TagAutocomplete
                        value={editTag}
                        onChange={setEditTag}
                        style={{ width: '160px' }}
                      />
                      <input
                        type="text"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        placeholder="Date"
                        maxLength={40}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          fontSize: '16px',
                          fontFamily: "'Source Serif 4', Georgia, serif",
                          fontStyle: 'italic',
                          background: '#FFFEFA',
                          width: '120px'
                        }}
                      />
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Note (optional)"
                        maxLength={280}
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '4px 8px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          fontSize: '16px',
                          fontFamily: "'Source Serif 4', Georgia, serif",
                          fontStyle: 'italic',
                          background: '#FFFEFA'
                        }}
                      />
                    </div>
                    {editTag !== 'other' && (
                      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {editImageUrl ? (
                          <>
                            <CoverThumbnail imageUrl={editImageUrl} tag={editTag} />
                            {TAG_TO_MEDIA_TYPE[editTag] && (
                              <button
                                type="button"
                                onClick={() => { setCoverSearchContext('edit'); setShowCoverSearch(true) }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#4A7BA7', padding: '2px 0' }}
                              >
                                Change
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditImageUrl('')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#999', padding: '2px 0' }}
                            >
                              Remove
                            </button>
                          </>
                        ) : TAG_TO_MEDIA_TYPE[editTag] ? (
                          <button
                            type="button"
                            onClick={() => { setCoverSearchContext('edit'); setShowCoverSearch(true) }}
                            style={{
                              background: 'none',
                              border: '1px dashed #ccc',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              padding: '6px 10px',
                              fontSize: '12px',
                              color: '#999',
                              fontStyle: 'italic'
                            }}
                          >
                            Search cover...
                          </button>
                        ) : (
                          <input
                            type="url"
                            value={editImageUrl}
                            onChange={(e) => setEditImageUrl(e.target.value)}
                            placeholder="Paste image URL..."
                            style={{
                              padding: '4px 8px',
                              border: '1px solid #ccc',
                              borderRadius: '3px',
                              fontSize: '16px',
                              fontStyle: 'italic',
                              background: '#FFFEFA',
                              width: '200px'
                            }}
                          />
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleEdit}
                        disabled={!editTitle.trim()}
                        style={{
                          padding: '6px 16px',
                          background: editTitle.trim() ? '#2C2C2C' : '#ccc',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '13px',
                          cursor: editTitle.trim() ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '6px 12px',
                          background: '#F5F1EB',
                          border: '1px solid #CCC',
                          borderRadius: '3px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          color: '#555'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal item display */
                  <div
                    key={item.id}
                    className="review-card"
                    data-index={index}
                    style={{
                      background: '#FFFEFA',
                      borderRadius: '2px',
                      padding: '10px 16px',
                      boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      position: 'relative',
                      zIndex: openMenuId === item.id ? 5 : 1
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleDone(item)}
                      style={{
                        background: 'none',
                        border: '1.5px solid #BBB',
                        borderRadius: '3px',
                        width: '18px',
                        height: '18px',
                        minWidth: '18px',
                        cursor: 'pointer',
                        marginTop: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                      title="Mark as done"
                    />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CoverThumbnail imageUrl={item.image_url} tag={item.tag} />
                      <span style={{ fontSize: '14px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                        {item.title}
                      </span>
                      {item.item_date && (
                        <span style={{ fontSize: '11px', color: '#A89F91', fontStyle: 'italic', flexShrink: 0 }}>{item.item_date}</span>
                      )}
                    </div>

                    {/* Overflow menu */}
                    <div ref={openMenuId === item.id ? menuRef : null} style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          fontSize: '16px',
                          color: '#A89F91',
                          lineHeight: 1,
                          letterSpacing: '1px'
                        }}
                        aria-label="Actions"
                      >
                        &middot;&middot;&middot;
                      </button>
                      {openMenuId === item.id && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: '#FFFEFA',
                          borderRadius: '4px',
                          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.12)',
                          padding: '4px 0',
                          minWidth: '100px',
                          zIndex: 10
                        }}>
                          <button
                            onClick={() => { startEdit(item); setOpenMenuId(null) }}
                            style={{
                              display: 'block',
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: '8px 16px',
                              fontSize: '14px',
                              color: '#2C2C2C',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { handleDelete(item.id); setOpenMenuId(null) }}
                            style={{
                              display: 'block',
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: '8px 16px',
                              fontSize: '14px',
                              color: '#C75D5D',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Done section */}
          {filteredDone.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <button
                onClick={() => setShowDone(!showDone)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                  fontSize: '13px',
                  color: '#999',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Done ({filteredDone.length})
                <span style={{
                  fontSize: '11px',
                  transition: 'transform 0.2s',
                  transform: showDone ? 'rotate(90deg)' : 'rotate(0deg)',
                  display: 'inline-block'
                }}>▸</span>
              </button>

              {showDone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {filteredDone.map((item, index) => (
                    <div
                      key={item.id}
                      className="review-card"
                      data-index={index}
                      style={{
                        background: '#FFFEFA',
                        borderRadius: '2px',
                        padding: '8px 16px',
                        boxShadow: '1px 2px 4px rgba(0, 0, 0, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        opacity: 0.6,
                        position: 'relative',
                        zIndex: openMenuId === item.id ? 5 : 1
                      }}
                    >
                      {/* Checked box */}
                      <button
                        onClick={() => handleToggleDone(item)}
                        style={{
                          background: 'none',
                          border: '1.5px solid #BBB',
                          borderRadius: '3px',
                          width: '18px',
                          height: '18px',
                          minWidth: '18px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          fontSize: '12px',
                          color: '#888'
                        }}
                        title="Mark as not done"
                      >
                        ✓
                      </button>

                      <CoverThumbnail imageUrl={item.image_url} tag={item.tag} />
                      <span style={{
                        fontSize: '14px',
                        fontStyle: 'italic',
                        textDecoration: 'line-through',
                        color: '#999',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.title}
                      </span>

                      {/* Write review link */}
                      <button
                        onClick={() => handleWriteReview(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          fontSize: '12px',
                          color: '#4A7BA7',
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Write a review?
                      </button>

                      {/* Overflow menu for done items */}
                      <div ref={openMenuId === item.id ? menuRef : null} style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            fontSize: '16px',
                            color: '#A89F91',
                            lineHeight: 1,
                            letterSpacing: '1px'
                          }}
                          aria-label="Actions"
                        >
                          &middot;&middot;&middot;
                        </button>
                        {openMenuId === item.id && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            background: '#FFFEFA',
                            borderRadius: '4px',
                            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.12)',
                            padding: '4px 0',
                            minWidth: '100px',
                            zIndex: 10
                          }}>
                            <button
                              onClick={() => { handleDelete(item.id); setOpenMenuId(null) }}
                              style={{
                                display: 'block',
                                width: '100%',
                                background: 'none',
                                border: 'none',
                                padding: '8px 16px',
                                fontSize: '14px',
                                color: '#C75D5D',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* From Friends — collapsible section */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <button
            onClick={() => setRecsExpanded(!recsExpanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              fontFamily: "'Caveat', cursive",
              fontSize: '22px',
              color: '#4A7BA7',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            From Friends ({recommendations.length})
            <span style={{
              fontSize: '14px',
              transition: 'transform 0.2s ease',
              transform: recsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'inline-block'
            }}>▸</span>
          </button>

          <AnimatePresence>
            {recsExpanded && (
              <Motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px' }}>
                  {recommendations.map((review) => (
                    <div
                      key={review.id}
                      style={{
                        background: '#FFFEFA',
                        borderRadius: '2px',
                        padding: '12px 16px',
                        boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px', fontStyle: 'italic' }}>
                        Recommended by {review.profiles?.display_name || 'a friend'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CoverThumbnail imageUrl={review.image_url} tag={review.tag} />
                        <h3 style={{ fontSize: '14px', fontStyle: 'italic', fontWeight: 400, margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {review.title}
                        </h3>
                        <span className="handwritten" style={{ fontSize: '14px', lineHeight: 1, color: '#2C2C2C', flexShrink: 0 }}>
                          {review.rating}/10
                        </span>

                        {/* Adopt button */}
                        <button
                          onClick={() => handleAdoptRec(review)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            color: '#8C8578',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: 1,
                            flexShrink: 0
                          }}
                          title="Add to my list"
                        >
                          +
                        </button>
                      </div>

                      {/* Expandable review text */}
                      {review.review_text && (
                        expandedRecs.has(review.id) ? (
                          <div>
                            <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: 1.6, color: '#2C2C2C', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                              {review.review_text}
                            </div>
                            <button
                              onClick={() => toggleRecExpanded(review.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontSize: '12px', color: '#4A7BA7', marginTop: '4px' }}
                            >
                              Show less
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleRecExpanded(review.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 0',
                              marginTop: '6px',
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                              {review.review_text}
                            </span>
                            <span style={{ fontSize: '12px', color: '#4A7BA7', flexShrink: 0 }}>Read more</span>
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <CoverSearchModal
        isOpen={showCoverSearch}
        onClose={() => setShowCoverSearch(false)}
        onSelect={({ imageUrl: url }) => {
          if (coverSearchContext === 'edit') {
            setEditImageUrl(url)
          } else {
            setNewImageUrl(url)
          }
        }}
        initialQuery={coverSearchContext === 'edit' ? editTitle : newTitle}
        mediaType={TAG_TO_MEDIA_TYPE[coverSearchContext === 'edit' ? editTag : newTag]}
      />

      <DictationModal
        isOpen={showDictation}
        onClose={() => setShowDictation(false)}
        mode="liste"
        onSaveDirectly={handleDictationSave}
      />
    </div>
  )
}
