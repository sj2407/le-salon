import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NotificationBell } from './NotificationBell'
import { NewsletterBell } from './NewsletterBell'
import { FriendSearch } from './FriendSearch'

export const Navigation = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/signin')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  const closeMenu = () => setIsMenuOpen(false)

  const handleNavClick = (path) => {
    closeMenu()
    navigate(path)
  }

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeMenu()
    }
    if (isMenuOpen) {
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  // Close menu on location change
  useEffect(() => {
    closeMenu()
  }, [location])

  if (!user) return null

  return (
    <>
      <nav>
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          {/* Centered title */}
          <Link to="/" style={{ textDecoration: 'none', color: '#2C2C2C', display: 'flex', alignItems: 'center' }}>
            <span className="nav-brand">Le Salon</span>
          </Link>

          {/* Right side: Search + Bell + Newsletter + Hamburger - absolutely positioned */}
          <div style={{ position: 'absolute', right: '0', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <FriendSearch />
            <NotificationBell />
            <NewsletterBell />

            {/* Hamburger Button (All Screens) */}
            <button
              className="hamburger-button hamburger-small"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Toggle menu"
              style={{ display: 'flex' }}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {isMenuOpen && (
        <>
          {/* Invisible backdrop for click-outside-to-close */}
          <div className="mobile-dropdown-backdrop" onClick={closeMenu}></div>

          {/* Dropdown Menu */}
          <div className="mobile-dropdown-menu">
            <button onClick={() => handleNavClick('/')} className="mobile-dropdown-item">
              Le Salon
            </button>
            <button onClick={() => handleNavClick('/my-corner')} className="mobile-dropdown-item">
              My Corner
            </button>
            <button onClick={() => handleNavClick('/todo')} className="mobile-dropdown-item">
              Activity Board
            </button>
            <button onClick={() => handleNavClick('/friends')} className="mobile-dropdown-item">
              Friends
            </button>
            <button onClick={() => handleNavClick('/notifications')} className="mobile-dropdown-item">
              Notifications
            </button>
            <button onClick={() => handleNavClick('/newsletter')} className="mobile-dropdown-item">
              Newsletter
            </button>
            <button onClick={() => handleNavClick('/help')} className="mobile-dropdown-item">
              Help
            </button>
            <button onClick={handleSignOut} className="mobile-dropdown-item">
              Sign Out
            </button>
          </div>
        </>
      )}
    </>
  )
}
