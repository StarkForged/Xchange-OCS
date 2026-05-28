import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import { categories } from '../../mock/categories'
import defaultAvatar from '../../assets/images/default-avatar.jpg'

// ── Global Nav Drawer ─────────────────────────────────────────────────────

const DRAWER_LINKS = [
  { to: '/',                   label: 'Home',         protected: false, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { to: '/listings',           label: 'Browse',       protected: false, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
  { to: '/dashboard',          label: 'Dashboard',    protected: true,  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" /></svg> },
  { to: '/dashboard/listings', label: 'My Listings',  protected: true,  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg> },
  { to: '/chat',               label: 'Messages',     protected: true,  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
  { to: '/dashboard/saved',    label: 'Saved',        protected: true,  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
  { to: '/dashboard/profile',  label: 'Profile',      protected: true,  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  { to: '/dashboard/settings', label: 'Settings',     protected: true,  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
]

function NavDrawer({ open, onClose }) {
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const avatarSrc = user?.profileImage?.trim() || defaultAvatar

  const handleLogout = () => { clearAuth(); onClose(); navigate('/login') }
  const links = DRAWER_LINKS.filter(l => !l.protected || isAuthenticated)

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900">Menu</span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { navigate('/dashboard/profile'); onClose() }}>
            <img src={avatarSrc} alt={user?.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-100 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-150">
              <span className="text-gray-400">{l.icon}</span>{l.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-4 space-y-2">
          {isAuthenticated ? (
            <>
              <Link to="/create-listing" onClick={onClose} className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Post a Listing
              </Link>
              <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-medium py-2.5 rounded-xl transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>Sign Out
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" onClick={onClose} className="flex-1 text-center border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition">Login</Link>
              <Link to="/register" onClick={onClose} className="flex-1 text-center bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition">Register</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main Navbar ───────────────────────────────────────────────────────────

export default function Navbar() {
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchCat, setSearchCat]   = useState('all')

  const avatarSrc = user?.profileImage?.trim() || defaultAvatar

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm.trim()) params.set('q', searchTerm.trim())
    if (searchCat !== 'all') params.set('cat', searchCat)
    navigate(`/listings${params.toString() ? '?' + params.toString() : ''}`)
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 h-16 flex items-center gap-3">

          {/* Logo */}
          <Link to="/" className="text-xl font-extrabold text-indigo-600 tracking-tight hover:text-indigo-700 transition-colors flex-shrink-0 mr-1">
            Xchange
          </Link>

          {/* Search bar — desktop only */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-xl h-10 rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:border-indigo-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
          >
            {/* Category selector */}
            <select
              value={searchCat}
              onChange={(e) => setSearchCat(e.target.value)}
              className="pl-3 pr-1 text-xs font-semibold text-gray-600 bg-gray-50 border-r border-gray-200 cursor-pointer focus:outline-none whitespace-nowrap flex-shrink-0"
            >
              <option value="all">All</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Text input */}
            <div className="flex-1 flex items-center px-3 gap-2">
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search listings, categories…"
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
              />
            </div>

            {/* Submit */}
            <button type="submit" className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex-shrink-0">
              Search
            </button>
          </form>

          {/* Spacer on mobile */}
          <div className="flex-1 md:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-1">

            {/* Messages */}
            {isAuthenticated && (
              <Link to="/chat" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Messages">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </Link>
            )}

            {/* Saved */}
            {isAuthenticated && (
              <Link to="/dashboard/saved" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Saved listings">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </Link>
            )}

            {/* Notifications (placeholder) */}
            {isAuthenticated && (
              <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:text-amber-500 hover:bg-amber-50 transition-colors relative" title="Notifications">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            )}

            {/* Sell CTA */}
            {isAuthenticated && (
              <Link to="/create-listing" className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm ml-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Sell
              </Link>
            )}

            {/* Avatar → /dashboard/profile */}
            {isAuthenticated ? (
              <button onClick={() => navigate('/dashboard/profile')} className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 hover:ring-indigo-400 transition-all flex-shrink-0 ml-1" title={user?.name}>
                <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
              </button>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link to="/login"    className="hidden sm:block text-sm text-gray-700 hover:text-indigo-600 transition-colors px-3 py-1.5 font-medium">Login</Link>
                <Link to="/register" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm">Register</Link>
              </div>
            )}

            {/* Hamburger */}
            <button onClick={() => setDrawerOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors ml-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile search row */}
        <form
          onSubmit={handleSearch}
          className="md:hidden px-4 pb-3 flex gap-2"
        >
          <div className="flex-1 flex items-center h-9 bg-gray-100 rounded-xl px-3 gap-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-200 border border-transparent focus-within:border-indigo-300 transition-all">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search anything…"
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
            />
          </div>
          <button type="submit" className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0">
            Go
          </button>
        </form>
      </nav>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
