import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
        <Link to="/" className="nav-brand" style={{ textDecoration: 'none', color: '#2C2C2C' }}>
          Le Salon
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/">My Card</Link>
          <Link to="/history">History</Link>
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
