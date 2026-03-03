import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { MyCard } from './MyCard'
// import { History } from './History' // Hidden for now — component preserved for future use
import { Reviews } from './Reviews'
import { LaListe } from './LaListe'
import { Wishlist } from './Wishlist'
import { Portrait } from './Portrait'
// import { Profile } from './Profile' // Merged into Card tab — edit via gear icon
import { ProfileEditModal } from '../components/ProfileEditModal'
import { GearSix } from '@phosphor-icons/react'

const MY_CORNER_TABS = ['card', 'reviews', 'liste', 'wishlist', 'portrait']

export const MyCorner = () => {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'card')
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  // Update active tab when URL param changes (adjust state during render, not in effect)
  const [prevSearchParams, setPrevSearchParams] = useState(searchParams)
  if (prevSearchParams !== searchParams) {
    setPrevSearchParams(searchParams)
    const tabParam = searchParams.get('tab')
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }

  return (
    <div className="container">
      <div style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Tab Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingLeft: '10px', paddingRight: '4px' }}>
          {MY_CORNER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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
              {tab === 'card' ? 'Card' : tab === 'reviews' ? 'Reviews' : tab === 'liste' ? 'La Liste' : tab === 'wishlist' ? 'Wishlist' : 'Portrait'}
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
              marginLeft: 'auto',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
            title="Edit Profile"
          >
            <GearSix size={18} weight="duotone" color="#7A3B2E" />
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ marginTop: '-20px' }}>
          {activeTab === 'card' && <div style={{ marginTop: '-30px' }}><MyCard /></div>}
          {activeTab === 'reviews' && <Reviews />}
          {activeTab === 'liste' && <LaListe />}
          {activeTab === 'wishlist' && <Wishlist />}
          {activeTab === 'portrait' && <Portrait />}
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
