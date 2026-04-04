import { useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Cross-platform camera/photo picker.
 *
 * On native (iOS): uses @capacitor/camera for the native camera UI.
 * On web: falls back to <input type="file">.
 *
 * Returns { pickImage } which resolves to:
 *   { base64: string, previewUrl: string, blob: Blob }
 * or null if the user cancelled.
 *
 * @param {object} options
 * @param {boolean} options.camera - If true, prefer camera; if false, prefer gallery.
 *                                   On native this controls the source. On web this sets
 *                                   the `capture` attribute.
 */
export function useNativeCamera() {
  const inputRef = useRef(null)

  const pickImage = useCallback(async ({ camera = false } = {}) => {
    if (Capacitor.isNativePlatform()) {
      return pickNative(camera)
    }
    return pickWeb(inputRef, camera)
  }, [])

  return { pickImage }
}

/** Native path: @capacitor/camera → returns base64 */
async function pickNative(useCamera) {
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: useCamera ? CameraSource.Camera : CameraSource.Prompt,
      quality: 85,
      allowEditing: false,
      width: 2048,
      height: 2048,
    })

    if (!photo.base64String) return null

    // Create a File (not Blob) so .name is available for extension extraction
    const format = photo.format || 'jpeg'
    const mimeType = `image/${format}`
    const fileName = `photo_${Date.now()}.${format}`
    const byteChars = atob(photo.base64String)
    const bytes = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
    const file = new File([bytes], fileName, { type: mimeType })
    const previewUrl = URL.createObjectURL(file)

    return {
      base64: photo.base64String,
      previewUrl,
      blob: file,
    }
  } catch (err) {
    // User cancelled or permission denied
    if (err.message?.includes('cancelled') || err.message?.includes('canceled')) return null
    console.error('Native camera error:', err)
    return null
  }
}

/** Web fallback: <input type="file"> */
function pickWeb(inputRef, useCamera) {
  return new Promise((resolve) => {
    // Create a temporary file input
    if (!inputRef.current) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.style.display = 'none'
      document.body.appendChild(input)
      inputRef.current = input
    }

    const input = inputRef.current
    if (useCamera) {
      input.setAttribute('capture', 'environment')
    } else {
      input.removeAttribute('capture')
    }

    let resolved = false
    input.onchange = async () => {
      resolved = true
      const file = input.files?.[0]
      if (!file) { resolve(null); return }

      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const base64 = btoa(binary)
      const previewUrl = URL.createObjectURL(file)

      resolve({ base64, previewUrl, blob: file })
      // Reset so the same file can be selected again
      input.value = ''
    }

    // Detect cancel: when the file picker closes, window regains focus
    const onFocus = () => {
      window.removeEventListener('focus', onFocus)
      setTimeout(() => { if (!resolved) resolve(null) }, 300)
    }
    window.addEventListener('focus', onFocus)

    input.click()
  })
}
