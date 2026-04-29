import { supabase } from './supabase'

// Uploads a profile photo to Supabase Storage and returns its public URL.
// If oldUrl is provided and points to a different file under profile-photo/,
// the previous file is deleted to avoid orphans. Throws on failure.
export async function uploadProfilePhoto({ file, userId, oldUrl }) {
  const fileExt = file.name.split('.').pop().toLowerCase()
  const fileName = `photo-${Date.now()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('profile-photo')
    .upload(filePath, file)

  if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`)

  if (oldUrl) {
    const oldPath = oldUrl.split('/profile-photo/')[1]?.split('?')[0]
    if (oldPath && oldPath !== filePath) {
      await supabase.storage.from('profile-photo').remove([oldPath])
    }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('profile-photo')
    .getPublicUrl(filePath)

  return publicUrl
}
