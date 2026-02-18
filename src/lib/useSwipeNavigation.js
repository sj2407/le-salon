import { useRef, useCallback, useEffect } from 'react'

const SWIPE_THRESHOLD = 50
const DIRECTION_LOCK_RATIO = 1.5
const DIRECTION_DECIDE_PX = 10
const WHEEL_THRESHOLD = 60
const WHEEL_COOLDOWN_MS = 500

/**
 * Hook for horizontal swipe navigation between tabs.
 * Uses native (non-passive) touch listeners so the browser can't steal
 * horizontal gestures for scrolling. Also supports mouse drag and trackpad wheel.
 *
 * Returns: containerRef (attach to swipeable wrapper), swipeHandlers (mouse/wheel),
 * direction ref, and handleTabClick.
 */
export function useSwipeNavigation(tabs, activeTab, setActiveTab) {
  const containerRef = useRef(null)
  const startRef = useRef(null)
  const direction = useRef(1)
  const wheelRef = useRef({ x: 0, timeout: null, cooldown: false })
  // Keep current values in refs so native listeners always see latest state
  const tabsRef = useRef(tabs)
  const activeTabRef = useRef(activeTab)
  tabsRef.current = tabs
  activeTabRef.current = activeTab

  const navigate = useCallback((deltaX) => {
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

  // Native touch listeners (non-passive) — attached via ref
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e) => {
      const t = e.touches[0]
      startRef.current = { x: t.clientX, y: t.clientY, swiped: false, direction: null }
    }

    const onTouchMove = (e) => {
      const s = startRef.current
      if (!s || s.swiped) return
      const t = e.touches[0]
      const deltaX = t.clientX - s.x
      const deltaY = t.clientY - s.y
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Decide gesture direction after a small movement
      if (!s.direction && (absX > DIRECTION_DECIDE_PX || absY > DIRECTION_DECIDE_PX)) {
        s.direction = absX > absY ? 'horizontal' : 'vertical'
      }

      // If horizontal, prevent scrolling and check threshold
      if (s.direction === 'horizontal') {
        e.preventDefault()
        if (absX >= SWIPE_THRESHOLD && absX > absY * DIRECTION_LOCK_RATIO) {
          s.swiped = true
          navigate(deltaX)
        }
      }
      // If vertical, do nothing — let the browser scroll normally
    }

    const onTouchEnd = () => {
      startRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [navigate])

  // Mouse drag (desktop) — capture mouseup on document for reliability
  const onMouseDown = useCallback((e) => {
    startRef.current = { x: e.clientX, y: e.clientY }
    const onDocMouseUp = (upEvent) => {
      document.removeEventListener('mouseup', onDocMouseUp)
      if (!startRef.current) return
      const deltaX = upEvent.clientX - startRef.current.x
      const deltaY = upEvent.clientY - startRef.current.y
      startRef.current = null
      if (Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * DIRECTION_LOCK_RATIO) {
        navigate(deltaX)
      }
    }
    document.addEventListener('mouseup', onDocMouseUp)
  }, [navigate])

  // Wheel events (Mac trackpad two-finger horizontal swipe)
  const onWheel = useCallback((e) => {
    const w = wheelRef.current
    if (w.cooldown) return
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return

    w.x += e.deltaX
    clearTimeout(w.timeout)

    if (Math.abs(w.x) > WHEEL_THRESHOLD) {
      w.cooldown = true
      navigate(-w.x)
      w.x = 0
      setTimeout(() => { w.cooldown = false }, WHEEL_COOLDOWN_MS)
      return
    }

    w.timeout = setTimeout(() => { w.x = 0 }, 200)
  }, [navigate])

  const handleTabClick = useCallback((tabKey) => {
    const currentIndex = tabsRef.current.indexOf(activeTabRef.current)
    const targetIndex = tabsRef.current.indexOf(tabKey)
    if (currentIndex === targetIndex) return
    direction.current = targetIndex > currentIndex ? 1 : -1
    setActiveTab(tabKey)
  }, [setActiveTab])

  const swipeHandlers = { onMouseDown, onWheel }

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
