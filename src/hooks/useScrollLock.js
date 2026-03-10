import { useEffect } from 'react'
import { scrollLock } from '../lib/scrollLock'

/**
 * Lock body scroll when a modal/form is active.
 * Prevents iOS keyboard viewport shift issues.
 *
 * @param {boolean} isActive - Whether to lock scrolling
 */
export const useScrollLock = (isActive) => {
  useEffect(() => {
    if (isActive) scrollLock.enable()
    else scrollLock.disable()
    return () => scrollLock.disable()
  }, [isActive])
}
