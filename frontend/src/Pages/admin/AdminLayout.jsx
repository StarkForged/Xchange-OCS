import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import useAdminStore from '../../store/adminAuth.Store'

const NAV = [
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Listings',
    to: '/admin/listings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: 'Reviews',
    to: '/admin/reviews',
    soon: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    to: '/admin/reports',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
  },
  {
    label: 'Categories',
    to: '/admin/categories',
    soon: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    to: '/admin/settings',
    soon: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

function Sidebar({ collapsed, onToggle }) {
  const { admin, clearAuth } = useAdminStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/admin/login', { replace: true })
  }

  return (
    <aside className={`
      flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800
      transition-all duration-300 ease-in-out
      ${collapsed ? 'w-16' : 'w-60'}
    `}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight">Xchange</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Admin</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            }
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-indigo-600 text-white'
                : item.soon
                  ? 'text-slate-600 cursor-default'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }
            `}
            onClick={item.soon ? (e) => e.preventDefault() : undefined}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <span className="flex-1 truncate">{item.label}</span>
            )}
            {!collapsed && item.soon && (
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Soon</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Admin user + logout */}
      <div className="border-t border-slate-800 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {admin?.name?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-300 truncate">{admin?.name || 'Admin'}</p>
              <p className="text-[10px] text-slate-500 truncate">{admin?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            title="Sign out"
            className="w-full flex items-center justify-center h-8 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  )
}

function Breadcrumb() {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)

  const crumbs = parts.map((part, i) => ({
    label: part.charAt(0).toUpperCase() + part.slice(1),
    path:  '/' + parts.slice(0, i + 1).join('/'),
    last:  i === parts.length - 1,
  }))

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500">
      {crumbs.map((c) => (
        <span key={c.path} className="flex items-center gap-1.5">
          {!c.last && (
            <>
              <span className={c.path === '/admin' ? 'text-slate-400' : 'text-slate-600'}>{c.label}</span>
              <span className="text-slate-700">/</span>
            </>
          )}
          {c.last && <span className="text-slate-300 font-semibold">{c.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="flex-shrink-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4">
          <Breadcrumb />
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
