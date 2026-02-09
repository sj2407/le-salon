import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MyCard } from './MyCard'
import { History } from './History'
import { Reviews } from './Reviews'
import { RecsFromFriends } from './RecsFromFriends'
import { Wishlist } from './Wishlist'
import { Profile } from './Profile'

export const MyCorner = () => {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('card')

  // Update active tab when URL param changes (e.g., after signup)
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  return (
    <div className="container">
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1px', marginBottom: '8px', overflowX: 'auto', paddingLeft: '20px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
        <button
          onClick={() => setActiveTab('card')}
          style={{
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            padding: '8px 10px',
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
          onClick={() => setActiveTab('history')}
          style={{
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            padding: '8px 10px',
            fontSize: '13px',
            fontWeight: activeTab === 'history' ? 600 : 400,
            color: activeTab === 'history' ? '#2C2C2C' : '#777',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            padding: '8px 10px',
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
          onClick={() => setActiveTab('recs')}
          style={{
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            padding: '8px 10px',
            fontSize: '13px',
            fontWeight: activeTab === 'recs' ? 600 : 400,
            color: activeTab === 'recs' ? '#2C2C2C' : '#777',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          Recs
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          style={{
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            padding: '8px 10px',
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
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            padding: '8px 10px',
            fontSize: '13px',
            fontWeight: activeTab === 'profile' ? 600 : 400,
            color: activeTab === 'profile' ? '#2C2C2C' : '#777',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          Profile
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: '-20px' }}>
        {activeTab === 'card' && <div style={{ marginTop: '-40px' }}><MyCard /></div>}
        {activeTab === 'history' && <History />}
        {activeTab === 'reviews' && <Reviews />}
        {activeTab === 'recs' && <RecsFromFriends />}
        {activeTab === 'wishlist' && <Wishlist />}
        {activeTab === 'profile' && <Profile />}
      </div>
    </div>
  )
}
