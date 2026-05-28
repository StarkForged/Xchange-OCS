import { Outlet, NavLink, useLocation } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'

// ── Mobile Bottom Navigation ──────────────────────────────────────────────

const BOTTOM_NAV = [
  {
    to: '/',
    end: true,
    label: 'Home',
    icon: (active) => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/listings',
    label: 'Browse',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    to: '/create-listing',
    label: 'Sell',
    sell: true,
    icon: () => (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    to: '/chat',
    label: 'Messages',
    icon: (active) => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'Account',
    icon: (active) => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch h-16">
        {BOTTOM_NAV.map((item) => {
          if (item.sell) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 group"
              >
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-200 transition-all duration-150 group-hover:scale-105 -mt-3">
                  {item.icon(false)}
                </div>
                <span className="text-[10px] font-bold text-indigo-600 mt-0.5">{item.label}</span>
              </NavLink>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                  isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.icon(isActive)}
                  <span className={`text-[10px] font-semibold ${isActive ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

// ── Main Layout ───────────────────────────────────────────────────────────

export default function MainLayout() {
  const { pathname } = useLocation()
  // Full-screen chat page manages its own height — hide bottom nav there
  const isFullscreenChat = pathname.startsWith('/chat/') && pathname !== '/chat'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className={isFullscreenChat ? '' : 'pb-16 md:pb-0'}>
        <Outlet />
      </main>
      {!isFullscreenChat && <MobileBottomNav />}
    </div>
  )
}
