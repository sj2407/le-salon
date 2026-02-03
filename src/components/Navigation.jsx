import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import salonIcon from '../assets/salon-icon.jpeg'

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
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#2C2C2C', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={salonIcon}
              alt="Le Salon"
              style={{
                height: '48px',
                width: 'auto',
                borderRadius: '3px',
                border: '1.5px solid #2C2C2C',
                boxShadow: '2px 2px 0 rgba(44, 44, 44, 0.3)'
              }}
            />
            <span className="nav-brand">Le Salon</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-links-desktop">
            <Link to="/">My Card</Link>
            <Link to="/history">History</Link>
            <Link to="/reviews">Reviews</Link>
            <Link to="/todo">Activity Board</Link>
            <Link to="/friends">Friends</Link>
            <Link to="/profile">Profile</Link>
            <button onClick={handleSignOut} style={{ padding: '6px 16px', fontSize: '13px' }}>
              Sign Out
            </button>
          </div>

          {/* Hamburger Button (Mobile Only) */}
          <button
            className="hamburger-button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="mobile-menu-overlay" onClick={closeMenu}>
          <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button className="mobile-menu-close" onClick={closeMenu} aria-label="Close menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Navigation Items */}
            <nav className="mobile-menu-nav">
              <button onClick={() => handleNavClick('/')} className="mobile-nav-item">
                My Card
              </button>
              <button onClick={() => handleNavClick('/history')} className="mobile-nav-item">
                History
              </button>
              <button onClick={() => handleNavClick('/reviews')} className="mobile-nav-item">
                Reviews
              </button>
              <button onClick={() => handleNavClick('/todo')} className="mobile-nav-item">
                Activity Board
              </button>
              <button onClick={() => handleNavClick('/friends')} className="mobile-nav-item">
                Friends
              </button>
              <button onClick={() => handleNavClick('/profile')} className="mobile-nav-item">
                Profile
              </button>
            </nav>

            {/* Sign Out Button */}
            <div className="mobile-menu-separator"></div>
            <button onClick={handleSignOut} className="mobile-sign-out">
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
