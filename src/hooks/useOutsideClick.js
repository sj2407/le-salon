import { useEffect, useRef } from 'react'

/**
 * Close a menu/dropdown on click outside or Escape key.
 * Uses a ref for the callback to avoid stale closures.
 *
 * @param {React.RefObject} ref - Ref to the menu container element
 * @param {Function} onClose - Callback to close the menu
 * @param {boolean} isActive - Whether the menu is currently open
 */
export const useOutsideClick = (ref, onClose, isActive) => {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isActive) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onCloseRef.current()
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isActive, ref])
}
