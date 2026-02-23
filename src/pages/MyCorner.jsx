import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { MyCard } from './MyCard'
// import { History } from './History' // Hidden for now — component preserved for future use
import { Reviews } from './Reviews'
import { LaListe } from './LaListe'
import { Wishlist } from './Wishlist'
// import { Profile } from './Profile' // Merged into Card tab — edit via gear icon
import { useSwipeNavigation, tabSlideVariants, tabSlideTransition } from '../lib/useSwipeNavigation'

const MY_CORNER_TABS = ['card', 'reviews', 'liste', 'wishlist']

export const MyCorner = () => {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'card')
  const { containerRef, swipeHandlers, direction, handleTabClick } = useSwipeNavigation(MY_CORNER_TABS, activeTab, setActiveTab)

  // Update active tab when URL param changes (adjust state during render, not in effect)
  const [prevSearchParams, setPrevSearchParams] = useState(searchParams)
  if (prevSearchParams !== searchParams) {
    setPrevSearchParams(searchParams)
    const tabParam = searchParams.get('tab')
    if (tabParam && tabParam !== activeTab) {
      const targetIndex = MY_CORNER_TABS.indexOf(tabParam)
      const currentIndex = MY_CORNER_TABS.indexOf(activeTab)
      if (targetIndex !== -1) {
        direction.current = targetIndex > currentIndex ? 1 : -1
      }
      setActiveTab(tabParam)
    }
  }

  return (
    <div className="container">
      <div ref={containerRef} {...swipeHandlers} style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none', minHeight: 'calc(100vh - 120px)' }}>
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1px', marginBottom: '8px', overflowX: 'auto', paddingLeft: '10px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
          <button
            onClick={() => handleTabClick('card')}
            style={{
              background: 'none',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              padding: '8px 6px',
              fontSize: '13px',
              fontWeight: activeTab === 'card' ? 600 : 400,
              color: activeTab === 'card' ? '#2C2C2C' : '#777',
              marginBottom: '-2px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            Card
          </button>
          <button
            onClick={() => handleTabClick('reviews')}
            style={{
              background: 'none',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              padding: '8px 6px',
              fontSize: '13px',
              fontWeight: activeTab === 'reviews' ? 600 : 400,
              color: activeTab === 'reviews' ? '#2C2C2C' : '#777',
              marginBottom: '-2px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            Reviews
          </button>
          <button
            onClick={() => handleTabClick('liste')}
            style={{
              background: 'none',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              padding: '8px 6px',
              fontSize: '13px',
              fontWeight: activeTab === 'liste' ? 600 : 400,
              color: activeTab === 'liste' ? '#2C2C2C' : '#777',
              marginBottom: '-2px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            La Liste
          </button>
          <button
            onClick={() => handleTabClick('wishlist')}
            style={{
              background: 'none',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              padding: '8px 6px',
              fontSize: '13px',
              fontWeight: activeTab === 'wishlist' ? 600 : 400,
              color: activeTab === 'wishlist' ? '#2C2C2C' : '#777',
              marginBottom: '-2px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            Wishlist
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ marginTop: '-20px', overflowX: 'clip' }}>
          <AnimatePresence mode="wait" initial={false} custom={direction.current}>
            <Motion.div
              key={activeTab}
              custom={direction.current}
              variants={tabSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={tabSlideTransition}
            >
              {activeTab === 'card' && <div style={{ marginTop: '-30px' }}><MyCard /></div>}
              {activeTab === 'reviews' && <Reviews />}
              {activeTab === 'liste' && <LaListe />}
              {activeTab === 'wishlist' && <Wishlist />}
            </Motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
