import { useState } from 'react'
import { MyCard } from './MyCard'
import { History } from './History'
import { Reviews } from './Reviews'
import { Wishlist } from './Wishlist'
import { Profile } from './Profile'

export const MyCorner = () => {
  const [activeTab, setActiveTab] = useState('card')

  return (
    <div className="container">
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', overflowX: 'auto', paddingLeft: '20px' }}>
        <button
          onClick={() => setActiveTab('card')}
          style={{
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            padding: '8px 12px',
            fontSize: '14px',
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
            padding: '8px 12px',
            fontSize: '14px',
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
            padding: '8px 12px',
            fontSize: '14px',
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
          onClick={() => setActiveTab('wishlist')}
          style={{
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            padding: '8px 12px',
            fontSize: '14px',
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
            padding: '8px 12px',
            fontSize: '14px',
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
        {activeTab === 'card' && <div style={{ marginTop: '-15px' }}><MyCard /></div>}
        {activeTab === 'history' && <History />}
        {activeTab === 'reviews' && <Reviews />}
        {activeTab === 'wishlist' && <Wishlist />}
        {activeTab === 'profile' && <Profile />}
      </div>
    </div>
  )
}
