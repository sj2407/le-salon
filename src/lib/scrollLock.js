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
    scrollPosition = window.pageYOffset
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollPosition}px`
    document.body.style.width = '100%'
  },

  disable() {
    if (!isLocked) return
    isLocked = false
    document.body.style.removeProperty('overflow')
    document.body.style.removeProperty('position')
    document.body.style.removeProperty('top')
    document.body.style.removeProperty('width')
    window.scrollTo(0, scrollPosition)
  }
}
