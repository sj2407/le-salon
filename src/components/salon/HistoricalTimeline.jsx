import { useRef, useEffect, useMemo, useState } from 'react'

/**
 * Historical timeline showing when each philosophical movement peaked.
 * Concurrent movements stack vertically in "lanes" to show overlap.
 * Responsive — fits within container width, no horizontal scroll needed
 * for small numbers of weeks.
 */

const LANE_HEIGHT = 18
const LANE_GAP = 2
const BAR_RADIUS = 9
const MIN_BAR_WIDTH = 36

const formatYear = (year) => {
  if (year < 0) return `${Math.abs(year)} av. J.-C.`
  return `${year}`
}

/** Shorten long titles for bar labels */
const shortTitle = (title) => {
  const abbrev = {
    'Augustine and Early Christian Philosophy': 'Augustine',
    'Islamic Golden Age Philosophy': 'Islamic Philosophy',
    'Scholasticism and Aquinas': 'Scholasticism',
    'Machiavelli and Political Realism': 'Machiavelli',
    'Descartes and the Method of Doubt': 'Descartes',
    'Empiricism: Locke and Hume': 'Locke & Hume',
    'Rousseau and the Social Contract': 'Rousseau',
    'Kant and the Moral Law': 'Kant',
  }
  return abbrev[title] || title
}

/**
 * Assign lanes so overlapping periods stack vertically.
 */
function assignLanes(weeks) {
  const sorted = [...weeks]
    .filter(w => w.period_start_year != null && w.period_end_year != null)
    .sort((a, b) => a.period_start_year - b.period_start_year)

  const lanes = [] // lanes[i] = end year of last item placed in lane i

  return sorted.map(week => {
    let lane = 0
    for (let i = 0; i < lanes.length; i++) {
      if (week.period_start_year > lanes[i]) {
        lane = i
        break
      }
      lane = i + 1
    }
    lanes[lane] = week.period_end_year
    return { ...week, lane }
  })
}

export const HistoricalTimeline = ({ weeks, activeWeekId, onWeekSelect }) => {
  const containerRef = useRef(null)
  const activeBarRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setContainerWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const laneData = useMemo(() => assignLanes(weeks), [weeks])

  const laneCount = useMemo(() => {
    if (laneData.length === 0) return 1
    return Math.max(...laneData.map(w => w.lane)) + 1
  }, [laneData])

  const minYear = useMemo(() => {
    if (laneData.length === 0) return 0
    return Math.min(...laneData.map(w => w.period_start_year))
  }, [laneData])

  const maxYear = useMemo(() => {
    if (laneData.length === 0) return 100
    return Math.max(...laneData.map(w => w.period_end_year))
  }, [laneData])

  const yearSpan = maxYear - minYear || 1
  const padding = 12

  // Use actual container width for positioning
  const usableWidth = Math.max(containerWidth - padding * 2, 100)

  const yearToX = (year) => {
    return padding + ((year - minYear) / yearSpan) * usableWidth
  }

  // Auto-scroll to center active bar (only when scrollable)
  useEffect(() => {
    if (activeBarRef.current && containerRef.current) {
      const bar = activeBarRef.current
      const container = containerRef.current
      if (container.scrollWidth > container.clientWidth) {
        const barCenter = bar.offsetLeft + bar.offsetWidth / 2
        const scrollTarget = barCenter - container.clientWidth / 2
        container.scrollTo({ left: scrollTarget, behavior: 'smooth' })
      }
    }
  }, [activeWeekId, containerWidth])

  // Generate axis tick labels
  const axisTicks = useMemo(() => {
    const ticks = []
    const niceSteps = [50, 100, 200, 500, 1000]
    const rawStep = yearSpan / 4
    const step = niceSteps.find(s => s >= rawStep) || 1000
    const startTick = Math.ceil(minYear / step) * step
    for (let y = startTick; y <= maxYear; y += step) {
      ticks.push(y)
    }
    return ticks.sort((a, b) => a - b)
  }, [minYear, maxYear, yearSpan])

  if (laneData.length === 0) return null

  const barsHeight = laneCount * (LANE_HEIGHT + LANE_GAP) - LANE_GAP
  const totalHeight = barsHeight + 16

  return (
    <div
      ref={containerRef}
      className="hide-scrollbar"
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{
        position: 'relative',
        width: '100%',
        minWidth: containerWidth > 0 ? Math.max(containerWidth, laneData.length * 80) : '100%',
        height: totalHeight,
      }}>
        {/* Axis line */}
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: padding,
          right: padding,
          height: '1px',
          background: '#D4C9B8',
        }} />

        {/* Axis ticks */}
        {containerWidth > 0 && axisTicks.map(year => (
          <div
            key={year}
            style={{
              position: 'absolute',
              bottom: 0,
              left: yearToX(year),
              transform: 'translateX(-50%)',
              fontSize: '7px',
              color: '#A89F91',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}
          >
            {formatYear(year)}
          </div>
        ))}

        {/* Period bars */}
        {containerWidth > 0 && laneData.map(week => {
          const isActive = week.id === activeWeekId
          const x1 = yearToX(week.period_start_year)
          const x2 = yearToX(week.period_end_year)
          const rawWidth = x2 - x1
          const barWidth = Math.max(rawWidth, MIN_BAR_WIDTH)
          const barLeft = rawWidth < MIN_BAR_WIDTH ? x1 - (MIN_BAR_WIDTH - rawWidth) / 2 : x1
          const top = week.lane * (LANE_HEIGHT + LANE_GAP)

          return (
            <div
              key={week.id}
              ref={isActive ? activeBarRef : null}
              onClick={() => onWeekSelect(week.id)}
              style={{
                position: 'absolute',
                left: barLeft,
                top,
                width: barWidth,
                height: LANE_HEIGHT,
                borderRadius: BAR_RADIUS,
                background: isActive ? '#622722' : 'rgba(232, 220, 200, 0.7)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transition: 'background 0.3s ease, transform 0.2s ease',
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              <span style={{
                fontSize: '7.5px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#FFFEFA' : '#6B6156',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 4px',
                letterSpacing: '0.02em',
                fontFamily: "'Source Serif 4', Georgia, serif",
              }}>
                {shortTitle(week.parlor_title)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
