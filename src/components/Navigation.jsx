import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import salonIcon from '../assets/salon-icon.jpeg'

export const Navigation = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/signin')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  if (!user) return null

  return (
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      </div>
    </nav>
  )
}
