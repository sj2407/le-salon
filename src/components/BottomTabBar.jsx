import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'

const SalonIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2C2C2C' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const CornerIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2C2C2C' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
)

const ActivityIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2C2C2C' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="8" y1="9" x2="16" y2="9" />
    <line x1="8" y1="13" x2="14" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </svg>
)

const FriendsIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2C2C2C' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)

const MoreIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#2C2C2C' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1.5" fill={active ? '#2C2C2C' : '#999'} />
    <circle cx="12" cy="5" r="1.5" fill={active ? '#2C2C2C' : '#999'} />
    <circle cx="12" cy="19" r="1.5" fill={active ? '#2C2C2C' : '#999'} />
  </svg>
)

const TABS = [
  { key: 'salon', label: 'Salon', path: '/', Icon: SalonIcon, match: (p) => p === '/' },
  { key: 'corner', label: 'My Corner', path: '/my-corner', Icon: CornerIcon, match: (p) => p.startsWith('/my-corner') },
  { key: 'activity', label: 'Activity', path: '/todo', Icon: ActivityIcon, match: (p) => p.startsWith('/todo') },
  { key: 'friends', label: 'Friends', path: '/friends', Icon: FriendsIcon, match: (p) => p.startsWith('/friend') },
  { key: 'more', label: 'More', path: null, Icon: MoreIcon, match: () => false },
]

const MORE_ITEMS = [
  { label: 'Notifications', path: '/notifications' },
  { label: 'Newsletter', path: '/newsletter' },
  { label: 'Account Settings', path: '/account' },
  { label: 'Help', path: '/help' },
]

export const BottomTabBar = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  const menuRef = useRef(null)

  // Close More menu on Escape or click outside
  useEffect(() => {
    if (!moreOpen) return
    const handleClick = (e) => {
      if (
        moreRef.current && !moreRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setMoreOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [moreOpen])

  // Close More menu on navigation (derived state pattern — no effect needed)
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname)
    setMoreOpen(false)
  }

  if (!user) return null

  const handleTabClick = (tab) => {
    if (tab.key === 'more') {
      setMoreOpen(!moreOpen)
    } else {
      setMoreOpen(false)
      navigate(tab.path)
    }
  }

  const handleMoreItem = async (item) => {
    setMoreOpen(false)
    if (item.path) {
      navigate(item.path)
    }
  }

  const handleSignOut = async () => {
    setMoreOpen(false)
    try {
      await signOut()
      navigate('/signin')
    } catch {
      // silently handled
    }
  }

  // Check if any More-menu page is active
  const isMorePageActive = MORE_ITEMS.some(item => location.pathname.startsWith(item.path))

  return (
    <>
      <div className="bottom-tab-bar">
        {TABS.map((tab) => {
          const isActive = tab.key === 'more'
            ? (moreOpen || isMorePageActive)
            : tab.match(location.pathname)

          return (
            <button
              key={tab.key}
              ref={tab.key === 'more' ? moreRef : undefined}
              onClick={() => handleTabClick(tab)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 12px',
                minWidth: '56px',
              }}
              aria-label={tab.label}
            >
              <tab.Icon active={isActive} />
              <span style={{
                fontFamily: "'Caveat', cursive",
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2C2C2C' : '#999',
                lineHeight: 1,
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {moreOpen && createPortal(
        <div ref={menuRef} className="more-menu">
          {MORE_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => handleMoreItem(item)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: location.pathname.startsWith(item.path) ? '#F5F0EB' : 'transparent',
                border: 'none',
                padding: '10px 16px',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: '14px',
                cursor: 'pointer',
                color: '#2C2C2C',
              }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #E8E8E8', margin: '4px 0' }} />
          <button
            onClick={handleSignOut}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              padding: '10px 16px',
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: '14px',
              cursor: 'pointer',
              color: '#C0392B',
            }}
          >
            Sign Out
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
