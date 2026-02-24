/**
 * Haptic feedback for mobile devices.
 *
 * - iOS Safari 18+: checkbox switch trick (the only working web API for iOS haptics).
 *   A persistent <input type="checkbox" switch> is created once and kept alive off-screen.
 *   Calling .click() on its label triggers the native haptic engine.
 *
 * - Android: navigator.vibrate()
 *
 * - Desktop / unsupported: silent no-op
 */

let _hapticLabel = null
let _isTouch = null

function isTouch() {
  if (_isTouch !== null) return _isTouch
  _isTouch =
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches
  return _isTouch
}

function getHapticLabel() {
  if (_hapticLabel) return _hapticLabel
  if (typeof document === 'undefined') return null
  if (!isTouch()) return null

  const label = document.createElement('label')
  Object.assign(label.style, {
    position: 'fixed',
    top: '-999px',
    left: '-999px',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    opacity: '0',
    pointerEvents: 'none',
  })
  label.ariaHidden = 'true'

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.appendChild(input)
  document.body.appendChild(label)

  _hapticLabel = label
  return _hapticLabel
}

export function hapticTap() {
  try {
    // Android
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(1)
      return
    }
    // iOS Safari 18+ — checkbox switch trick
    const label = getHapticLabel()
    if (label) label.click()
  } catch {
    // Silent fail on unsupported devices
  }
}

export function hapticConfirm() {
  hapticTap()
  setTimeout(hapticTap, 100)
}

export function hapticError() {
  hapticTap()
  setTimeout(hapticTap, 100)
  setTimeout(hapticTap, 200)
}
