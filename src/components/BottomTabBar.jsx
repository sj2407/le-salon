import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { House, BookOpen, ListChecks, Users, DotsThreeVertical } from '@phosphor-icons/react'

const ICON_ACTIVE = '#7A3B2E'
const ICON_INACTIVE = '#8C7B6B'

const SalonIcon = ({ active }) => (
  <House size={24} weight="duotone" color={active ? ICON_ACTIVE : ICON_INACTIVE} />
)

const CornerIcon = ({ active }) => (
  <BookOpen size={24} weight="duotone" color={active ? ICON_ACTIVE : ICON_INACTIVE} />
)

const ActivityIcon = ({ active }) => (
  <ListChecks size={24} weight="duotone" color={active ? ICON_ACTIVE : ICON_INACTIVE} />
)

const FriendsIcon = ({ active }) => (
  <Users size={24} weight="duotone" color={active ? ICON_ACTIVE : ICON_INACTIVE} />
)

const MoreIcon = ({ active }) => (
  <DotsThreeVertical size={24} weight="duotone" color={active ? ICON_ACTIVE : ICON_INACTIVE} />
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
                outline: 'none',
                boxShadow: 'none',
                WebkitTapHighlightColor: 'transparent',
                cursor: 'pointer',
                padding: '4px 12px',
                minWidth: '48px',
              }}
              aria-label={tab.label}
            >
              <tab.Icon active={isActive} />
              <span style={{
                fontFamily: "'Caveat', cursive",
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#7A3B2E' : '#8C7B6B',
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
