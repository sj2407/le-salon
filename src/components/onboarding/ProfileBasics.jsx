import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNativeCamera } from '../../hooks/useNativeCamera'
import { uploadProfilePhoto } from '../../lib/profilePhoto'
import { supabase } from '../../lib/supabase'

// Step 1: minimal profile basics. display name (pre-filled) + optional photo.
// Diff-aware save: empty/unchanged values do NOT overwrite existing data.
// This is the only step that mutates real data, by design.
export const ProfileBasics = ({ onContinue, onSkip }) => {
  const { profile, user, refreshProfile } = useAuth()
  const toast = useToast()
  const { pickImage } = useNativeCamera()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(profile?.profile_photo_url || '')
  const [saving, setSaving] = useState(false)

  const handlePickPhoto = async () => {
    const result = await pickImage({ camera: false })
    if (!result) return
    setPhotoFile(result.blob)
    setPhotoPreview(result.previewUrl)
  }

  const handleContinue = async () => {
    setSaving(true)
    try {
      const updates = {}
      const trimmed = displayName.trim()
      if (trimmed && trimmed !== (profile?.display_name || '')) {
        updates.display_name = trimmed
      }
      if (photoFile) {
        updates.profile_photo_url = await uploadProfilePhoto({
          file: photoFile,
          userId: user.id,
          oldUrl: profile?.profile_photo_url,
        })
      }
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
        if (error) throw error
        await refreshProfile()
      }
      onContinue()
    } catch (err) {
      toast.error(err.message || 'Could not save')
      setSaving(false)
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
    }}>
      <h2 className="handwritten" style={{ fontSize: '34px', marginBottom: '8px', color: '#2C2C2C' }}>
        A few basics
      </h2>
      <p style={{ fontSize: '14px', color: '#777', marginBottom: '28px' }}>
        So friends know who they're hearing from.
      </p>

      <button
        type="button"
        onClick={handlePickPhoto}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          marginBottom: '8px',
        }}
        aria-label={photoPreview ? 'Change photo' : 'Add photo'}
      >
        {photoPreview ? (
          <img
            src={photoPreview}
            alt="Profile preview"
            style={{
              width: '92px',
              height: '92px',
              borderRadius: '50%',
              objectFit: 'cover',
              filter: 'contrast(1.05) saturate(1.1)',
            }}
          />
        ) : (
          <div style={{
            width: '92px',
            height: '92px',
            borderRadius: '50%',
            border: '2px dashed #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '13px',
            fontStyle: 'italic',
          }}>
            Add photo
          </div>
        )}
      </button>
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '24px', fontStyle: 'italic' }}>
        Optional
      </div>

      <div style={{ width: '100%', maxWidth: '320px', marginBottom: '24px', textAlign: 'left' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
          Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="What should friends call you?"
          style={{ width: '100%' }}
        />
      </div>

      <button
        onClick={handleContinue}
        disabled={saving}
        style={{
          padding: '12px 36px',
          background: '#622722',
          color: '#FFFEFA',
          border: 'none',
          borderRadius: '3px',
          fontSize: '16px',
          cursor: saving ? 'not-allowed' : 'pointer',
          marginBottom: '12px',
          opacity: saving ? 0.6 : 1,
          fontFamily: 'inherit',
        }}
      >
        {saving ? 'Saving...' : 'Continue'}
      </button>
      <button
        onClick={onSkip}
        disabled={saving}
        style={{
          background: 'none',
          border: 'none',
          color: '#777',
          fontSize: '13px',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Skip
      </button>
    </div>
  )
}
