import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import Avatar from '../common/Avatar'

export default function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-bold text-indigo-600 tracking-tight hover:text-indigo-700 transition-colors"
        >
          Xchange
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-sm text-gray-600 hover:text-indigo-600 transition-colors hidden sm:block"
          >
            Browse
          </Link>

          {isAuthenticated && (
            <Link
              to="/chat"
              className="relative text-gray-600 hover:text-indigo-600 transition-colors hidden sm:flex items-center gap-1.5 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Messages
            </Link>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/create-listing"
                className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                + Sell
              </Link>
              <span className="text-sm text-gray-700 hidden sm:block">
                Hi, {user?.name?.split(' ')[0]}
              </span>
              <Avatar src={user?.profileImage} name={user?.name} size="sm" />
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm text-gray-700 hover:text-indigo-600 transition-colors px-3 py-1.5"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
