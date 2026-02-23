import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { MyCard } from './MyCard'
// import { History } from './History' // Hidden for now — component preserved for future use
import { Reviews } from './Reviews'
import { LaListe } from './LaListe'
import { Wishlist } from './Wishlist'
// import { Profile } from './Profile' // Merged into Card tab — edit via gear icon
import { ProfileEditModal } from '../components/ProfileEditModal'
import { useSwipeNavigation, tabSlideVariants, tabSlideTransition } from '../lib/useSwipeNavigation'

const MY_CORNER_TABS = ['card', 'reviews', 'liste', 'wishlist']

export const MyCorner = () => {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'card')
  const [showProfileEdit, setShowProfileEdit] = useState(false)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingLeft: '10px', paddingRight: '4px' }}>
          {MY_CORNER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              style={{
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                padding: '8px 8px',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? '#2C2C2C' : '#777',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab === 'card' ? 'Card' : tab === 'reviews' ? 'Reviews' : tab === 'liste' ? 'La Liste' : 'Wishlist'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowProfileEdit(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              opacity: 0.4,
              marginLeft: 'auto',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
            title="Edit Profile"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
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
      <AnimatePresence>
        {showProfileEdit && (
          <ProfileEditModal key="profile-edit" onClose={() => setShowProfileEdit(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
