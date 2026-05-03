import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.jsx'

// Configure native iOS plugins
if (Capacitor.isNativePlatform()) {
  // Status bar style
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Light })
  }).catch(() => {})

  // Keyboard: expose height as CSS variable so layout can adapt without resize
  import('@capacitor/keyboard').then(({ Keyboard }) => {
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`)
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px')
    })
    Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {})
  }).catch(() => {})
}

// Scroll a focused input into view if it would otherwise sit behind the iOS
// keyboard. Skipped if the input is already in the visible region (avoids
// jitter on already-visible inputs like search bars at the top of modals).
const KEYBOARD_INPUT_SELECTOR = 'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]), textarea, select'
document.addEventListener('focusin', (e) => {
  const target = e.target
  if (!(target instanceof HTMLElement)) return
  if (!target.matches(KEYBOARD_INPUT_SELECTOR)) return
  setTimeout(() => {
    if (document.activeElement !== target) return
    const rect = target.getBoundingClientRect()
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight
    if (rect.bottom > visibleHeight - 20 || rect.top < 0) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, 280)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
