/**
 * iOS Safari scroll lock utility.
 *
 * When the virtual keyboard opens inside a form/modal, iOS shifts the viewport.
 * On keyboard dismiss the viewport doesn't always restore correctly, pushing
 * the page content behind the status bar.
 *
 * Fix: freeze the body with position:fixed while a form is active, then
 * restore the exact scroll position when the form closes.
 *
 * Usage:
 *   useEffect(() => {
 *     if (formOpen) scrollLock.enable()
 *     else scrollLock.disable()
 *     return () => scrollLock.disable()
 *   }, [formOpen])
 */

let scrollPosition = 0
let isLocked = false

export const scrollLock = {
  enable() {
    if (isLocked) return
    isLocked = true
    // Target .app-scroll-content — the actual scrollable container.
    // document.body is already overflow:hidden in index.css, so locking body is a no-op.
    const scrollEl = document.querySelector('.app-scroll-content')
    if (scrollEl) {
      scrollPosition = scrollEl.scrollTop
      scrollEl.style.overflow = 'hidden'
    }
  },

  disable() {
    if (!isLocked) return
    isLocked = false
    const scrollEl = document.querySelector('.app-scroll-content')
    if (scrollEl) {
      scrollEl.style.removeProperty('overflow')
      scrollEl.scrollTop = scrollPosition
    }
  }
}
