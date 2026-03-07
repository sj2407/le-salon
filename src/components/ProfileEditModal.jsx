import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion as Motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

export const ProfileEditModal = ({ onClose }) => {
  const { profile, user, refreshProfile } = useAuth()
  const toast = useToast()
  const backdropRef = useRef(null)
  const imgRef = useRef(null)
  const dragRef = useRef(null)

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [email] = useState(profile?.email || '')
  const [location, setLocation] = useState(profile?.location || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [favoriteBooks, setFavoriteBooks] = useState(profile?.favorite_books || '')
  const [favoriteArtists, setFavoriteArtists] = useState(profile?.favorite_artists || '')
  const [astroSign, setAstroSign] = useState(profile?.astro_sign || '')
  const [spiritAnimal, setSpiritAnimal] = useState(profile?.spirit_animal || '')
  const [favoriteQuote, setFavoriteQuote] = useState(profile?.favorite_quote || '')
  const [photoUrl, setPhotoUrl] = useState(profile?.profile_photo_url || '')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPosition, setPhotoPosition] = useState(profile?.profile_photo_position || '50% 50%')
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Dirty tracking — snapshot initial state
  const [initialSnapshot] = useState(() => JSON.stringify({
    displayName: profile?.display_name || '',
    location: profile?.location || '',
    bio: profile?.bio || '',
    favoriteBooks: profile?.favorite_books || '',
    favoriteArtists: profile?.favorite_artists || '',
    astroSign: profile?.astro_sign || '',
    spiritAnimal: profile?.spirit_animal || '',
    favoriteQuote: profile?.favorite_quote || '',
    photoPosition: profile?.profile_photo_position || '50% 50%'
  }))

  const isDirty = photoFile !== null || JSON.stringify({
    displayName, location, bio, favoriteBooks, favoriteArtists,
    astroSign, spiritAnimal, favoriteQuote, photoPosition
  }) !== initialSnapshot

  // Escape key — close if clean
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isDirty) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, isDirty])

  // Backdrop click — close if clean
  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current && !isDirty) {
      onClose()
    }
  }

  // Photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setMessage('Photo must be under 10MB')
        return
      }
      setPhotoFile(file)
      setPhotoPosition('50% 50%')
      setMessage('')
      const reader = new FileReader()
      reader.onloadend = () => setPhotoUrl(reader.result)
      reader.readAsDataURL(file)
    }
  }

  // Drag-to-reposition
  const handleDragStart = useCallback((e) => {
    e.preventDefault()
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const [startXPct, startYPct] = photoPosition.split(' ').map(v => parseFloat(v))
    dragRef.current = { startY: clientY, startX: clientX, startXPct, startYPct }
    setIsDragging(true)
  }, [photoPosition])

  const handleDragMove = useCallback((e) => {
    if (!dragRef.current || !imgRef.current) return
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const rect = imgRef.current.getBoundingClientRect()
    const deltaX = clientX - dragRef.current.startX
    const deltaY = clientY - dragRef.current.startY
    const xPct = Math.max(0, Math.min(100, dragRef.current.startXPct - (deltaX / rect.width) * 100))
    const yPct = Math.max(0, Math.min(100, dragRef.current.startYPct - (deltaY / rect.height) * 100))
    setPhotoPosition(`${Math.round(xPct)}% ${Math.round(yPct)}%`)
  }, [])

  const handleDragEnd = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e) => handleDragMove(e)
    const onEnd = () => handleDragEnd()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  const handleSave = async () => {
    if (!displayName.trim()) {
      setMessage('Name is required')
      return
    }
    setLoading(true)
    setMessage('')

    try {
      let uploadedPhotoUrl = profile?.profile_photo_url || ''

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop().toLowerCase()
        const fileName = `photo-${Date.now()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('profile-photo')
          .upload(filePath, photoFile)

        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`)

        // Delete old photo file if it exists
        const oldUrl = profile?.profile_photo_url
        if (oldUrl) {
          const oldPath = oldUrl.split('/profile-photo/')[1]?.split('?')[0]
          if (oldPath && oldPath !== filePath) {
            await supabase.storage.from('profile-photo').remove([oldPath])
          }
        }

        const { data: { publicUrl } } = supabase.storage
          .from('profile-photo')
          .getPublicUrl(filePath)

        uploadedPhotoUrl = publicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          location,
          bio,
          favorite_books: favoriteBooks,
          favorite_artists: favoriteArtists,
          astro_sign: astroSign,
          spirit_animal: spiritAnimal,
          favorite_quote: favoriteQuote,
          profile_photo_url: uploadedPhotoUrl,
          profile_photo_position: photoPosition,
        })
        .eq('id', user.id)

      if (updateError) throw new Error(`Profile update failed: ${updateError.message}`)

      await refreshProfile()
      toast.success('Profile updated')
      onClose()
    } catch (err) {
      setMessage(err.message || 'Failed to update profile')
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <Motion.div
      ref={backdropRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 9999,
        overflowY: 'auto',
        paddingTop: '20px',
        paddingBottom: '20px'
      }}
      onClick={handleBackdropClick}
    >
      <Motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          background: '#FFFEFA',
          borderRadius: '3px',
          padding: '14px',
          width: '90%',
          maxWidth: '400px',
          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
        }}
        className="profile-edit-compact"
      >
        <h3 className="handwritten" style={{ fontSize: '22px', marginBottom: '10px', marginTop: 0, textAlign: 'center' }}>
          Edit Profile
        </h3>

        {/* Photo */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          {photoUrl ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div
                ref={imgRef}
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: 'grab',
                  touchAction: 'none',
                  position: 'relative',
                }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
                <img
                  src={photoUrl}
                  alt="Profile"
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: photoPosition,
                    filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                Drag to reposition
              </div>
            </div>
          ) : (
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              border: '2px dashed #ccc',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '13px',
              fontStyle: 'italic'
            }}>
              No photo
            </div>
          )}

          <div style={{ marginTop: '8px' }}>
            <label htmlFor="profile-photo-upload" style={{
              padding: '6px 16px',
              background: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#777',
            }}>
              {photoUrl ? 'Change Photo' : 'Upload Photo'}
            </label>
            <input
              id="profile-photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        {/* Email (read-only) */}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            value={email}
            disabled
            style={{ background: '#F5F1EB', cursor: 'not-allowed' }}
          />
        </div>

        {/* Location */}
        <div className="form-group">
          <label className="form-label">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Paris, Brooklyn, Tokyo"
          />
        </div>

        {/* Bio */}
        <div className="form-group">
          <label className="form-label">About / Interests</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell friends a bit about yourself..."
            rows={bio ? Math.max(1, Math.ceil(bio.length / 50)) : 1}
            style={{ minHeight: '36px' }}
          />
        </div>

        {/* Favorite Books */}
        <div className="form-group">
          <label className="form-label">Favorite Books</label>
          <input
            type="text"
            value={favoriteBooks}
            onChange={(e) => setFavoriteBooks(e.target.value)}
            placeholder="e.g., To Kill a Mockingbird, 1984"
          />
        </div>

        {/* Favorite Artists */}
        <div className="form-group">
          <label className="form-label">Favorite Artists</label>
          <input
            type="text"
            value={favoriteArtists}
            onChange={(e) => setFavoriteArtists(e.target.value)}
            placeholder="e.g., Taylor Swift, The Beatles"
          />
        </div>

        {/* Astro Sign */}
        <div className="form-group">
          <label className="form-label">Astro Sign</label>
          <input
            type="text"
            value={astroSign}
            onChange={(e) => setAstroSign(e.target.value)}
            placeholder="e.g., Leo, Virgo, Aquarius"
          />
        </div>

        {/* Spirit Animal */}
        <div className="form-group">
          <label className="form-label">Spirit Animal</label>
          <input
            type="text"
            value={spiritAnimal}
            onChange={(e) => setSpiritAnimal(e.target.value)}
            placeholder="e.g., Wolf, Owl, Dolphin"
          />
        </div>

        {/* Favorite Quote */}
        <div className="form-group">
          <label className="form-label">Favorite Quote or Saying</label>
          <textarea
            value={favoriteQuote}
            onChange={(e) => setFavoriteQuote(e.target.value)}
            placeholder="A quote or saying that inspires you..."
            rows={favoriteQuote ? Math.max(1, Math.ceil(favoriteQuote.length / 50)) : 1}
            style={{ minHeight: '36px' }}
          />
        </div>

        {message && (
          <div className={message.includes('success') ? 'success-message' : 'error-message'}>
            {message}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              flex: 1,
              padding: '8px 14px',
              background: '#622722',
              color: '#FFFEFA',
              border: 'none',
              borderRadius: '3px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '8px 14px',
              background: '#FFFEFA',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#777'
            }}
          >
            Cancel
          </button>
        </div>
      </Motion.div>
    </Motion.div>,
    document.body
  )
}
