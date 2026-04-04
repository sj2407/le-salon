import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { TAG_ICONS, TAG_OPTIONS, TAG_LABELS } from '../lib/reviewConstants'
import { CoverSearchModal } from './cover-search/CoverSearchModal'
import { ConfirmModal } from './ConfirmModal'

// Map ai_classification/tag to CoverSearchModal mediaType
const TAG_TO_MEDIA_TYPE = {
  book: 'book',
  movie: 'movie',
  show: 'show',
  album: 'album',
  podcast: 'podcast',
}

export const PendingSharesCatchUp = ({ onDone }) => {
  const { user } = useAuth()
  const toast = useToast()
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  // Per-item editing state keyed by share id
  const [editState, setEditState] = useState({})
  const [processing, setProcessing] = useState({})
  // Cover search modal
  const [coverModal, setCoverModal] = useState({ open: false, shareId: null })
  const [confirmState, setConfirmState] = useState(null)

  const initItemState = useCallback((share) => {
    const fields = share.ai_extracted_fields || {}
    return {
      title: fields.title || share.raw_metadata?.title || share.source_url,
      creator: fields.creator || '',
      tag: fields.tag || share.ai_classification || 'other',
      date_text: fields.date_text || '',
      city: fields.city || '',
      location: fields.location || '',
      price: fields.price || '',
      note: fields.note || '',
      imageUrl: share.raw_metadata?.image || null,
      routed_to: share.routed_to || 'la_liste',
    }
  }, [])

  const fetchShares = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('pending_shares')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setShares(data)
      const state = {}
      data.forEach(s => { state[s.id] = initItemState(s) })
      setEditState(state)
    }
    setLoading(false)
  }, [user, initItemState])

  useEffect(() => {
    fetchShares()
  }, [fetchShares])

  // If no shares after loading, skip straight to Salon
  useEffect(() => {
    if (!loading && shares.length === 0) {
      onDone()
    }
  }, [loading, shares.length, onDone])

  const updateField = (shareId, field, value) => {
    setEditState(prev => ({
      ...prev,
      [shareId]: { ...prev[shareId], [field]: value }
    }))
  }

  const handleReclassify = async (share, newRoute) => {
    updateField(share.id, 'routed_to', newRoute)
    await supabase
      .from('pending_shares')
      .update({ routed_to: newRoute })
      .eq('id', share.id)
  }

  const handleConfirm = async (share) => {
    setProcessing(prev => ({ ...prev, [share.id]: true }))
    const fields = editState[share.id]
    if (!fields) return

    try {
      if (fields.routed_to === 'activity') {
        const { error } = await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            description: fields.title,
            date_text: fields.date_text || null,
            city: fields.city || null,
            location: fields.location || null,
            price: fields.price || null,
            image_url: fields.imageUrl || null,
          })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('discovery_items')
          .insert({
            user_id: user.id,
            title: fields.title,
            tag: TAG_OPTIONS.includes(fields.tag) ? fields.tag : 'other',
            note: fields.note || null,
            image_url: fields.imageUrl || null,
            item_date: new Date().toISOString().slice(0, 10),
            cover_manual: !!fields.imageUrl,
          })
        if (error) throw error
      }

      await supabase
        .from('pending_shares')
        .update({ status: 'confirmed' })
        .eq('id', share.id)

      toast.success(
        fields.routed_to === 'activity' ? 'Added to Activities' : 'Added to La Liste'
      )

      setShares(prev => prev.filter(s => s.id !== share.id))
    } catch {
      toast.error('Failed to save — try again')
    } finally {
      setProcessing(prev => ({ ...prev, [share.id]: false }))
    }
  }

  const handleDismiss = async (share) => {
    try {
      await supabase
        .from('pending_shares')
        .update({ status: 'dismissed' })
        .eq('id', share.id)
      setShares(prev => prev.filter(s => s.id !== share.id))
    } catch {
      toast.error('Failed to dismiss')
    }
  }

  const handleConfirmAll = async () => {
    setProcessing(prev => {
      const next = { ...prev }
      shares.forEach(s => { next[s.id] = true })
      return next
    })
    try {
      for (const share of shares) {
        const fields = editState[share.id]
        if (!fields) continue
        if (fields.routed_to === 'activity') {
          await supabase.from('activities').insert({
            user_id: user.id,
            description: fields.title,
            date_text: fields.date_text || null,
            city: fields.city || null,
            location: fields.location || null,
            price: fields.price || null,
            image_url: fields.imageUrl || null,
          })
        } else {
          await supabase.from('discovery_items').insert({
            user_id: user.id,
            title: fields.title,
            tag: TAG_OPTIONS.includes(fields.tag) ? fields.tag : 'other',
            note: fields.note || null,
            image_url: fields.imageUrl || null,
            item_date: new Date().toISOString().slice(0, 10),
            cover_manual: !!fields.imageUrl,
          })
        }
        await supabase.from('pending_shares').update({ status: 'confirmed' }).eq('id', share.id)
      }
      toast.success(`${shares.length} items confirmed`)
      setShares([])
    } catch {
      toast.error('Some items failed — check manually')
      await fetchShares()
    }
  }

  const handleDismissAll = () => {
    setConfirmState({
      message: `Dismiss all ${shares.length} pending shares?`,
      confirmText: 'Dismiss All',
      destructive: true,
      onConfirm: async () => {
        try {
          const ids = shares.map(s => s.id)
          await supabase.from('pending_shares').update({ status: 'dismissed' }).in('id', ids)
          setShares([])
        } catch {
          toast.error('Failed to dismiss all')
        }
      },
    })
  }

  const handleCoverSelect = (result) => {
    if (coverModal.shareId) {
      updateField(coverModal.shareId, 'imageUrl', result.imageUrl)
    }
    setCoverModal({ open: false, shareId: null })
  }

  if (loading) return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const miniInputStyle = {
    padding: '4px 8px',
    border: '1px solid #D4C9B8',
    borderRadius: '3px',
    fontSize: '16px',
    fontFamily: "'Source Serif 4', Georgia, serif",
    fontStyle: 'italic',
    background: '#FFFEFA',
    width: '117.65%',
    boxSizing: 'border-box',
    transform: 'scale(0.85)',
    transformOrigin: 'left top',
  }

  const responsiveInput = isMobile
    ? { ...miniInputStyle, width: '117.65%', marginBottom: '4px' }
    : miniInputStyle

  // Get mediaType for CoverSearchModal based on current share's tag
  const coverModalShare = coverModal.shareId ? editState[coverModal.shareId] : null
  const coverModalMediaType = coverModalShare
    ? TAG_TO_MEDIA_TYPE[coverModalShare.tag] || null
    : null

  return (
    <div style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: isMobile ? '16px 12px' : '32px 16px',
      minHeight: '100%',
    }}>
      {/* Header */}
      <h2 className="handwritten" style={{
        fontSize: '36px',
        textAlign: 'center',
        marginBottom: '4px',
      }}>
        Catch Up
      </h2>
      <p style={{
        textAlign: 'center',
        fontSize: '14px',
        color: '#999',
        fontFamily: "'Source Serif 4', Georgia, serif",
        fontStyle: 'italic',
        marginBottom: '24px',
      }}>
        {shares.length} item{shares.length !== 1 ? 's' : ''} shared since your last visit
      </p>

      {/* Batch actions */}
      {shares.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <button
            onClick={handleConfirmAll}
            style={{
              fontSize: '12px', color: '#5C6B4A', background: 'none',
              border: '1px solid #5C6B4A', borderRadius: '3px',
              padding: '4px 12px', cursor: 'pointer',
            }}
          >
            Confirm All ({shares.length})
          </button>
          <button
            onClick={handleDismissAll}
            style={{
              fontSize: '12px', color: '#999', background: 'none',
              border: '1px solid #D4C9B8', borderRadius: '3px',
              padding: '4px 12px', cursor: 'pointer',
            }}
          >
            Dismiss All
          </button>
          <button
            onClick={onDone}
            style={{
              fontSize: '12px', color: '#999', background: 'none',
              border: 'none', cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Skip for now
          </button>
        </div>
      )}

      {/* All items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {shares.map(share => {
          const fields = editState[share.id]
          if (!fields) return null
          const isProcessing = processing[share.id]

          return (
            <div
              key={share.id}
              style={{
                background: '#FFFEFA',
                borderRadius: '8px',
                padding: isMobile ? '12px' : '16px',
                boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                {/* Cover image + change button */}
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  {fields.imageUrl ? (
                    <img
                      src={fields.imageUrl}
                      alt=""
                      style={{
                        width: '80px',
                        height: '100px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '80px',
                      height: '100px',
                      borderRadius: '4px',
                      background: '#F5F0EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}>
                      {TAG_ICONS[fields.tag] || TAG_ICONS[share.ai_classification] || ''}
                    </div>
                  )}
                  <button
                    onClick={() => setCoverModal({ open: true, shareId: share.id })}
                    style={{
                      fontSize: '10px',
                      color: '#4A7BA7',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      marginTop: '4px',
                      textDecoration: 'underline',
                    }}
                  >
                    Change cover
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Classification badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#F5F0EB',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#622722',
                    marginBottom: '6px',
                  }}>
                    {TAG_ICONS[share.ai_classification] || ''}
                    {share.ai_classification === 'activity'
                      ? 'Activity'
                      : TAG_LABELS[fields.tag] || fields.tag || 'other'
                    }
                  </div>

                  {/* Editable title */}
                  <input
                    type="text"
                    value={fields.title || ''}
                    onChange={(e) => updateField(share.id, 'title', e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '16px',
                      fontFamily: "'Source Serif 4', Georgia, serif",
                      fontWeight: 600,
                      color: '#2C2C2C',
                      border: 'none',
                      borderBottom: '1px dashed #D4C9B8',
                      background: 'transparent',
                      padding: '2px 0',
                      marginBottom: '4px',
                      boxSizing: 'border-box',
                    }}
                  />

                  {/* Context-dependent fields */}
                  {fields.routed_to === 'activity' ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      <input placeholder="Date" value={fields.date_text} onChange={(e) => updateField(share.id, 'date_text', e.target.value)} style={responsiveInput} />
                      <input placeholder="City" value={fields.city} onChange={(e) => updateField(share.id, 'city', e.target.value)} style={responsiveInput} />
                      <input placeholder="Venue" value={fields.location} onChange={(e) => updateField(share.id, 'location', e.target.value)} style={responsiveInput} />
                      <input placeholder="Price" value={fields.price} onChange={(e) => updateField(share.id, 'price', e.target.value)} style={responsiveInput} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      <select
                        value={fields.tag}
                        onChange={(e) => updateField(share.id, 'tag', e.target.value)}
                        style={{ ...responsiveInput, width: isMobile ? '100%' : '120px' }}
                      >
                        {TAG_OPTIONS.map(t => (
                          <option key={t} value={t}>{TAG_ICONS[t]} {t}</option>
                        ))}
                      </select>
                      <input placeholder="Note (optional)" value={fields.note} onChange={(e) => updateField(share.id, 'note', e.target.value)} style={{ ...responsiveInput, flex: 1 }} />
                    </div>
                  )}

                  {/* Source URL */}
                  <a
                    href={share.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#999',
                      marginTop: '6px',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {share.source_url}
                  </a>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
                borderTop: '1px solid #F0EDE8',
                paddingTop: '10px',
              }}>
                <button
                  onClick={() => handleConfirm(share)}
                  disabled={isProcessing}
                  style={{
                    padding: '6px 14px',
                    background: '#622722',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '13px',
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.6 : 1,
                  }}
                >
                  {isProcessing ? 'Saving...' : (
                    fields.routed_to === 'activity' ? 'Add to Activities' : 'Add to La Liste'
                  )}
                </button>

                {/* Route toggle */}
                <button
                  onClick={() => handleReclassify(share,
                    fields.routed_to === 'activity' ? 'la_liste' : 'activity'
                  )}
                  style={{
                    padding: '6px 10px',
                    background: '#F5F1EB',
                    border: '1px solid #D4C9B8',
                    borderRadius: '3px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    color: '#555',
                  }}
                >
                  {fields.routed_to === 'activity' ? 'Move to La Liste' : 'Move to Activities'}
                </button>

                <button
                  onClick={() => handleDismiss(share)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#999',
                    padding: '6px 4px',
                    marginLeft: 'auto',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Single skip button at bottom if only 1 item */}
      {shares.length === 1 && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={onDone}
            style={{
              fontSize: '13px', color: '#999', background: 'none',
              border: 'none', cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: "'Source Serif 4', Georgia, serif",
            }}
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Cover search modal */}
      <CoverSearchModal
        isOpen={coverModal.open}
        onClose={() => setCoverModal({ open: false, shareId: null })}
        onSelect={handleCoverSelect}
        initialQuery={coverModalShare?.title || ''}
        mediaType={coverModalMediaType}
      />
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => { await confirmState?.onConfirm(); setConfirmState(null) }}
        title="Confirm"
        message={confirmState?.message || ''}
        confirmText={confirmState?.confirmText || 'Dismiss All'}
        destructive={confirmState?.destructive ?? true}
      />
    </div>
  )
}
