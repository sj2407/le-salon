import { useRef, useCallback, useEffect } from 'react'

const SWIPE_THRESHOLD = 50
const DIRECTION_LOCK_RATIO = 1.5
const WHEEL_THRESHOLD = 60
const SWIPE_COOLDOWN_MS = 400
const WHEEL_COOLDOWN_MS = 500

/**
 * Hook for horizontal swipe navigation between tabs.
 * Supports touch (mobile) and trackpad two-finger swipe (wheel).
 * Mouse drag removed — desktop users click tabs or use trackpad.
 *
 * containerRef: attach to outermost wrapper (tabs + content) so wheel
 *   preventDefault covers the full area and blocks browser back/forward.
 * swipeHandlers: spread onto the same wrapper for touch gestures.
 */
export function useSwipeNavigation(tabs, activeTab, setActiveTab) {
  const containerRef = useRef(null)
  const startRef = useRef(null)
  const direction = useRef(1)
  const cooldownRef = useRef(false)
  const wheelRef = useRef({ x: 0, timeout: null, cooldown: false })

  // Refs so every handler always sees the latest state
  const tabsRef = useRef(tabs)
  const activeTabRef = useRef(activeTab)
  tabsRef.current = tabs
  activeTabRef.current = activeTab

  // Single navigate function — all inputs read from refs
  const navigate = useCallback((deltaX) => {
    if (cooldownRef.current) return

    const currentTabs = tabsRef.current
    const currentTab = activeTabRef.current
    const currentIndex = currentTabs.indexOf(currentTab)

    if (deltaX < 0 && currentIndex < currentTabs.length - 1) {
      direction.current = 1
      cooldownRef.current = true
      setActiveTab(currentTabs[currentIndex + 1])
      setTimeout(() => { cooldownRef.current = false }, SWIPE_COOLDOWN_MS)
    } else if (deltaX > 0 && currentIndex > 0) {
      direction.current = -1
      cooldownRef.current = true
      setActiveTab(currentTabs[currentIndex - 1])
      setTimeout(() => { cooldownRef.current = false }, SWIPE_COOLDOWN_MS)
    }
  }, [setActiveTab])

  // --- Touch events (mobile) ---
  const onTouchStart = useCallback((e) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, swiped: false }
  }, [])

  const onTouchMove = useCallback((e) => {
    if (!startRef.current || startRef.current.swiped) return
    const deltaX = e.touches[0].clientX - startRef.current.x
    const deltaY = e.touches[0].clientY - startRef.current.y
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * DIRECTION_LOCK_RATIO) {
      startRef.current.swiped = true
      navigate(deltaX)
    }
  }, [navigate])

  const onTouchEnd = useCallback(() => {
    startRef.current = null
  }, [])

  // --- Trackpad wheel (non-passive to preventDefault browser back/forward) ---
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e) => {
      // Always block browser back/forward on horizontal swipes,
      // even during cooldown — momentum events must not leak through
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
      }

      const w = wheelRef.current
      if (w.cooldown) return
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return

      w.x += e.deltaX
      clearTimeout(w.timeout)

      if (Math.abs(w.x) > WHEEL_THRESHOLD) {
        w.cooldown = true
        navigate(-w.x)
        w.x = 0
        setTimeout(() => { w.cooldown = false; w.x = 0 }, WHEEL_COOLDOWN_MS)
        return
      }

      w.timeout = setTimeout(() => { w.x = 0 }, 200)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [navigate])

  const handleTabClick = useCallback((tabKey) => {
    const currentTabs = tabsRef.current
    const currentTab = activeTabRef.current
    const currentIndex = currentTabs.indexOf(currentTab)
    const targetIndex = currentTabs.indexOf(tabKey)
    if (currentIndex === targetIndex) return
    direction.current = targetIndex > currentIndex ? 1 : -1
    setActiveTab(tabKey)
  }, [setActiveTab])

  const swipeHandlers = { onTouchStart, onTouchMove, onTouchEnd }

  return { containerRef, swipeHandlers, direction, handleTabClick }
}

export const tabSlideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '40%' : '-40%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-40%' : '40%', opacity: 0 })
}

export const tabSlideTransition = {
  x: { type: 'tween', duration: 0.2, ease: 'easeOut' },
  opacity: { duration: 0.15 }
}
