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
    Keyboard.addListener('keyboardDidShow', (info) => {
      // Scroll focused input into view within modals/reader only
      const el = document.activeElement
      if (!el || el === document.body) return
      if (!el.closest('[data-modal], .reader-scroll')) return
      const rect = el.getBoundingClientRect()
      const visibleBottom = window.innerHeight - info.keyboardHeight
      if (rect.bottom > visibleBottom) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px')
    })
  }).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
