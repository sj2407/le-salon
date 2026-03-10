import { useEffect, useRef } from 'react'

/**
 * Close a modal on Escape key, but only if the form is clean.
 * Uses refs for callbacks to avoid re-subscribing on every keystroke.
 *
 * @param {boolean} isOpen - Whether the modal is currently open
 * @param {Function} onClose - Callback to close the modal
 * @param {Function} [isDirtyFn] - Optional function returning true if form has unsaved changes
 */
export const useEscapeClose = (isOpen, onClose, isDirtyFn) => {
  const onCloseRef = useRef(onClose)
  const isDirtyRef = useRef(isDirtyFn)
  onCloseRef.current = onClose
  isDirtyRef.current = isDirtyFn

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => {
      if (e.key === 'Escape' && (!isDirtyRef.current || !isDirtyRef.current())) {
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])
}
