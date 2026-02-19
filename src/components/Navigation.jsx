import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NotificationBell } from './NotificationBell'
import { NewsletterBell } from './NewsletterBell'
import { FriendSearch } from './FriendSearch'

const DESKTOP_LINKS = [
  { label: 'My Corner', path: '/my-corner' },
  { label: 'Activity', path: '/todo' },
  { label: 'Friends', path: '/friends' },
  { label: 'Account', path: '/account' },
  { label: 'Help', path: '/help' },
]

export const Navigation = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/signin')
    } catch {
      // silently handled
    }
  }

  if (!user) return null

  return (
    <nav>
      <div className="nav-inner">
        {/* Brand */}
        <Link to="/" className="nav-brand-link">
          <span className="nav-brand">Le Salon</span>
        </Link>

        {/* Desktop nav links — hidden on mobile via CSS */}
        <div className="nav-links-desktop">
          {DESKTOP_LINKS.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={location.pathname.startsWith(link.path) ? 'active' : ''}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="nav-signout-btn"
          >
            Sign Out
          </button>
        </div>

        {/* Right side: Search + Bells */}
        <div className="nav-icons">
          <FriendSearch />
          <NotificationBell />
          <NewsletterBell />
        </div>
      </div>
    </nav>
  )
}
