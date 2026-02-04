import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const Profile = () => {
  const { profile, user } = useAuth()
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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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
    }
  }, [profile])

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      // Preview the photo
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      let uploadedPhotoUrl = photoUrl

      // Upload photo if a new one was selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `photo.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('profile-photo')
          .upload(filePath, photoFile)

        if (uploadError) throw uploadError

        // Get public URL
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
          profile_photo_url: uploadedPhotoUrl
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setMessage('Profile updated successfully!')

      // Reload to update context
      window.location.reload()
    } catch (err) {
      console.error('Error updating profile:', err)
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
                <img
                  src={photoUrl}
                  alt="Profile"
                  style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #2C2C2C',
                    boxShadow: '4px 4px 0 #2C2C2C',
                    filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                    WebkitFilter: 'contrast(1.1) saturate(1.2) brightness(1.05)'
                  }}
                />
              </div>
            ) : (
              <div style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                border: '3px dashed #2C2C2C',
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

            <div style={{ marginTop: '16px' }}>
              <label htmlFor="photo-upload" style={{
                padding: '8px 20px',
                border: '1.5px solid #2C2C2C',
                borderRadius: '3px',
                background: '#FFFEFA',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'inline-block'
              }}>
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </label>
              <input
                id="photo-upload"
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
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Email cannot be changed
            </p>
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

          <button type="submit" disabled={loading} className="primary" style={{ width: '100%', marginTop: '16px' }}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
