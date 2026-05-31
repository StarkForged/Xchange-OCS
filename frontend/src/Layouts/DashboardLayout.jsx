import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/auth.Store'
import useNotificationStore from '../store/notification.Store'
import defaultAvatar from '../assets/images/default-avatar.jpg'

const NAV_MAIN = [
  {
    to: '/dashboard',
    end: true,
    label: 'Overview',
    icon: (
      <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/listings',
    label: 'My Listings',
    icon: (
      <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/messages',
    label: 'Messages',
    icon: (
      <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/saved',
    label: 'Saved',
    icon: (
      <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
]

const NAV_ACCOUNT = [
  {
    to: '/dashboard/profile',
    label: 'Profile',
    icon: (
      <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const navLinkCls = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
    isActive
      ? 'bg-indigo-50 text-indigo-700 font-semibold'
      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
  }`

function SidebarContent({ onClose }) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const avatarSrc = user?.profileImage && !user.profileImage.includes('default') ? user.profileImage : defaultAvatar

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full">

      {/* Logo header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 flex-shrink-0">
        <Link to="/" className="text-xl font-black text-indigo-600 tracking-tight">
          Xchange
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main</p>
        {NAV_MAIN.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkCls} onClick={onClose}>
            <span className="text-current">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="pt-5 pb-1">
          <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account</p>
          {NAV_ACCOUNT.map(item => (
            <NavLink key={item.to} to={item.to} className={navLinkCls} onClick={onClose}>
              <span className="text-current">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="pt-4">
          <Link
            to="/listings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all duration-150"
            onClick={onClose}
          >
            <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Marketplace
          </Link>
        </div>
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 border-t border-gray-100 p-3">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors duration-150"
          onClick={() => { navigate('/dashboard/profile'); onClose?.() }}
        >
          <img
            src={avatarSrc}
            alt={user?.name}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-indigo-100"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-gray-400 capitalize truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user }                      = useAuthStore()
  const { unreadCount, fetchNotifications, markAllRead } = useNotificationStore()
  const avatarSrc = user?.profileImage && !user.profileImage.includes('default') ? user.profileImage : defaultAvatar

  useEffect(() => { fetchNotifications() }, []) // eslint-disable-line

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-30
          flex flex-col shadow-sm
          transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen overflow-auto">

        {/* Top bar */}
        <header className="sticky top-0 z-10 h-16 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 flex-shrink-0">

          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all duration-150 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Greeting */}
          <div className="flex-1 hidden sm:block min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">
              {greeting()},{' '}
              <span className="text-indigo-600 font-semibold">{user?.name?.split(' ')[0]}</span>
            </p>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 ml-auto">
            <Link
              to="/create-listing"
              className="hidden sm:flex items-center gap-1.5 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all duration-150 shadow-sm hover:shadow-md"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Listing
            </Link>

            <button
              onClick={markAllRead}
              title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'Notifications'}
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:text-amber-500 hover:bg-amber-50 transition-all duration-150 relative"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] text-[9px] font-bold leading-none flex items-center justify-center rounded-full bg-red-500 text-white px-0.5 border border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-indigo-100 hover:ring-indigo-300 transition-all duration-150 flex-shrink-0">
              <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
