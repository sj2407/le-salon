import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNativeCamera } from '../hooks/useNativeCamera'

export const Profile = () => {
  const { profile, user, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [favoriteBooks, setFavoriteBooks] = useState('')
  const [favoriteArtists, setFavoriteArtists] = useState('')
  const [astroSign, setAstroSign] = useState('')
  const [spiritAnimal, setSpiritAnimal] = useState('')
  const [favoriteQuote, setFavoriteQuote] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPosition, setPhotoPosition] = useState('50% 50%')
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const dragRef = useRef(null)
  const imgRef = useRef(null)
  const { pickImage } = useNativeCamera()

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setEmail(profile.email || '')
      setLocation(profile.location || '')
      setBio(profile.bio || '')
      setFavoriteBooks(profile.favorite_books || '')
      setFavoriteArtists(profile.favorite_artists || '')
      setAstroSign(profile.astro_sign || '')
      setSpiritAnimal(profile.spirit_animal || '')
      setFavoriteQuote(profile.favorite_quote || '')
      setPhotoUrl(profile.profile_photo_url || '')
      setPhotoPosition(profile.profile_photo_position || '50% 50%')
    }
  }, [profile])

  const handlePhotoChange = async () => {
    const result = await pickImage({ camera: false })
    if (!result) return
    setPhotoFile(result.blob)
    setPhotoPosition('50% 50%')
    setMessage('')
    setPhotoUrl(result.previewUrl)
  }

  // Drag-to-reposition: convert pointer movement to object-position %
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
    // Map pixel drag to % (negative because dragging down should show more top)
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

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    if (!displayName.trim()) {
      setMessage('Name is required')
      return
    }
    setLoading(true)
    setMessage('')

    try {
      let uploadedPhotoUrl = profile?.profile_photo_url || ''

      // Upload photo if a new one was selected
      if (photoFile) {
        // Use unique filename to avoid CDN cache serving stale images
        const fileExt = photoFile.name.split('.').pop().toLowerCase()
        const fileName = `photo-${Date.now()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('profile-photo')
          .upload(filePath, photoFile)

        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`)

        // Delete old photo file if it exists (cleanup)
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

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          location: location,
          bio: bio,
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

      setMessage('Profile updated successfully!')
      setPhotoFile(null)
      await refreshProfile()
    } catch (err) {
      setMessage(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '12px', textAlign: 'center' }}>
        My Profile
      </h1>

      <div className="card" style={{ border: 'none', boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)' }}>
        <form onSubmit={handleSave}>
          {/* Profile Photo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            {photoUrl ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div
                  ref={imgRef}
                  style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: 'none',
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
                      WebkitFilter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                  Drag to reposition
                </div>
              </div>
            ) : (
              <div style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                border: '2px dashed #C8B89C',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                No photo
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button type="button" onClick={handlePhotoChange} style={{
                padding: '8px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#777',
              }}>
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSave}
                className="primary"
                style={{ padding: '8px 20px', fontSize: '14px' }}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
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

          {/* Bio/Interests */}
          <div className="form-group">
            <label className="form-label">About / Interests</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell friends a bit about yourself..."
              rows={bio ? Math.max(2, Math.ceil(bio.length / 60)) : 2}
              style={{ minHeight: '60px' }}
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
              rows={favoriteQuote ? Math.max(2, Math.ceil(favoriteQuote.length / 60)) : 2}
              style={{ minHeight: '60px' }}
            />
          </div>

          {message && (
            <div className={message.includes('success') ? 'success-message' : 'error-message'}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
