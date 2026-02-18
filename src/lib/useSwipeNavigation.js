import { useRef, useCallback, useEffect } from 'react'

const SWIPE_THRESHOLD = 50
const DIRECTION_LOCK_RATIO = 1.5
const WHEEL_THRESHOLD = 60
const WHEEL_COOLDOWN_MS = 500

/**
 * Hook for horizontal swipe navigation between tabs.
 * Supports touch (mobile), mouse drag, and trackpad two-finger swipe (wheel).
 *
 * Returns: containerRef (attach to wrapper div for wheel handling),
 * swipeHandlers (spread onto same div for touch/mouse), direction ref,
 * and handleTabClick.
 */
export function useSwipeNavigation(tabs, activeTab, setActiveTab) {
  const containerRef = useRef(null)
  const startRef = useRef(null)
  const direction = useRef(1)
  const wheelRef = useRef({ x: 0, timeout: null, cooldown: false })
  // Refs so the native wheel listener always sees current state
  const tabsRef = useRef(tabs)
  const activeTabRef = useRef(activeTab)
  tabsRef.current = tabs
  activeTabRef.current = activeTab

  const navigateWheel = useCallback((deltaX) => {
    const currentTabs = tabsRef.current
    const currentTab = activeTabRef.current
    const currentIndex = currentTabs.indexOf(currentTab)
    if (deltaX < 0 && currentIndex < currentTabs.length - 1) {
      direction.current = 1
      setActiveTab(currentTabs[currentIndex + 1])
    } else if (deltaX > 0 && currentIndex > 0) {
      direction.current = -1
      setActiveTab(currentTabs[currentIndex - 1])
    }
  }, [setActiveTab])

  const navigate = useCallback((deltaX, deltaY) => {
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY) * DIRECTION_LOCK_RATIO) {
      return
    }

    const currentIndex = tabs.indexOf(activeTab)
    if (deltaX < 0 && currentIndex < tabs.length - 1) {
      direction.current = 1
      setActiveTab(tabs[currentIndex + 1])
    } else if (deltaX > 0 && currentIndex > 0) {
      direction.current = -1
      setActiveTab(tabs[currentIndex - 1])
    }
  }, [tabs, activeTab, setActiveTab])

  // Touch events (mobile) — detect swipe during touchmove
  const onTouchStart = useCallback((e) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, swiped: false }
  }, [])

  const onTouchMove = useCallback((e) => {
    if (!startRef.current || startRef.current.swiped) return
    const deltaX = e.touches[0].clientX - startRef.current.x
    const deltaY = e.touches[0].clientY - startRef.current.y
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * DIRECTION_LOCK_RATIO) {
      startRef.current.swiped = true
      navigate(deltaX, deltaY)
    }
  }, [navigate])

  const onTouchEnd = useCallback(() => {
    startRef.current = null
  }, [])

  // Mouse drag (desktop) — capture mouseup on document for reliability
  const onMouseDown = useCallback((e) => {
    startRef.current = { x: e.clientX, y: e.clientY }
    const onDocMouseUp = (upEvent) => {
      document.removeEventListener('mouseup', onDocMouseUp)
      if (!startRef.current) return
      const deltaX = upEvent.clientX - startRef.current.x
      const deltaY = upEvent.clientY - startRef.current.y
      startRef.current = null
      navigate(deltaX, deltaY)
    }
    document.addEventListener('mouseup', onDocMouseUp)
  }, [navigate])

  // Native wheel listener (non-passive) so we can preventDefault
  // to stop browser back/forward on horizontal trackpad swipes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e) => {
      const w = wheelRef.current
      if (w.cooldown) return
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return

      e.preventDefault()

      w.x += e.deltaX
      clearTimeout(w.timeout)

      if (Math.abs(w.x) > WHEEL_THRESHOLD) {
        w.cooldown = true
        navigateWheel(-w.x)
        w.x = 0
        setTimeout(() => { w.cooldown = false }, WHEEL_COOLDOWN_MS)
        return
      }

      w.timeout = setTimeout(() => { w.x = 0 }, 200)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [navigateWheel])

  const handleTabClick = useCallback((tabKey) => {
    const currentIndex = tabs.indexOf(activeTab)
    const targetIndex = tabs.indexOf(tabKey)
    if (currentIndex === targetIndex) return
    direction.current = targetIndex > currentIndex ? 1 : -1
    setActiveTab(tabKey)
  }, [tabs, activeTab, setActiveTab])

  const swipeHandlers = { onTouchStart, onTouchMove, onTouchEnd, onMouseDown }

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
