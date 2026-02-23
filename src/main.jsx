import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Button press feedback — adds .pressing class on touch for reliable iOS support
document.addEventListener('touchstart', (e) => {
  const btn = e.target.closest('button, .filter-pill')
  if (btn) btn.classList.add('pressing')
}, { passive: true })

const removePressing = () => {
  document.querySelectorAll('.pressing').forEach(el => {
    setTimeout(() => el.classList.remove('pressing'), 100)
  })
}
document.addEventListener('touchend', removePressing, { passive: true })
document.addEventListener('touchcancel', removePressing, { passive: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
