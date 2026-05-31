import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { animate, AnimatePresence, motion } from 'framer-motion'
import {
  LayoutGrid, Grid3X3, Tag, MessageCircle,
  Bell, Heart, Plus, Menu, X, ChevronDown, ChevronRight,
  LogOut, Settings, User, LayoutDashboard, Bookmark,
  Smartphone, Car, Building2, Monitor, Armchair, Briefcase, Bike,
  Package,
} from 'lucide-react'
import useAuthStore from '../../store/auth.Store'
import useNotificationStore from '../../store/notification.Store'
import { categories } from '../../mock/categories'
import defaultAvatar from '../../assets/images/default-avatar.jpg'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const GLASS_HERO =
  'bg-white/[0.08] backdrop-blur-[24px] border border-white/[0.12] ' +
  'shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]'

const GLASS_LIGHT =
  'bg-white/[0.82] backdrop-blur-[20px] border border-black/[0.08] ' +
  'shadow-[0_4px_24px_rgba(0,0,0,0.08)]'

const RING_HOVER_HERO  = 'hover:shadow-[0_8px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.22),inset_0_1px_0_rgba(255,255,255,0.20)]'
const RING_HOVER_LIGHT = 'hover:shadow-[0_4px_24px_rgba(0,0,0,0.10),0_0_0_1px_rgba(99,102,241,0.14)]'
const RING_ACTIVE_HERO  = 'shadow-[0_8px_40px_rgba(99,102,241,0.20),0_0_0_1.5px_rgba(255,255,255,0.30),inset_0_1px_0_rgba(255,255,255,0.20)]'
const RING_ACTIVE_LIGHT = 'shadow-[0_4px_24px_rgba(99,102,241,0.16),0_0_0_1.5px_rgba(99,102,241,0.30)]'

const H_SIDE   = 'h-10'
const H_CENTER = 'h-12'
const MAX_W    = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'

const getGlass = (g) => g ? GLASS_HERO  : GLASS_LIGHT
const getRingH = (g) => g ? RING_HOVER_HERO  : RING_HOVER_LIGHT
const getRingA = (g) => g ? RING_ACTIVE_HERO : RING_ACTIVE_LIGHT

const CAT_ICONS = {
  mobiles:     Smartphone,
  cars:        Car,
  properties:  Building2,
  electronics: Monitor,
  furniture:   Armchair,
  jobs:        Briefcase,
  bikes:       Bike,
}

const CENTER_NAV = [
  { to: '/listings',           label: 'Browse',      end: true,  Icon: LayoutGrid,    protected: false              },
  { to: null,                  label: 'Categories',              Icon: Grid3X3,       protected: false, isDropdown: true },
  { to: '/dashboard/listings', label: 'My Listings', end: false, Icon: Tag,           protected: true               },
  { to: '/chat',               label: 'Messages',    end: false, Icon: MessageCircle, protected: true               },
]

// ─────────────────────────────────────────────────────────────────────────────
// useSpotlight
// ─────────────────────────────────────────────────────────────────────────────

function useSpotlight(cssVar) {
  const ref      = useRef(null)
  const currentX = useRef(0)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove  = e => {
      const r = el.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - r.left, r.width))
      currentX.current = x
      el.style.setProperty(cssVar, `${x}px`)
    }
    const onEnter = () => setHovered(true)
    const onLeave = () => setHovered(false)
    el.addEventListener('mousemove',  onMove)
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove',  onMove)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [cssVar])

  return { ref, currentX, hovered }
}

// ─────────────────────────────────────────────────────────────────────────────
// SpotlightCenterNav
//
// catOpen is owned by Navbar — single source of truth, no local timer here.
//
// Hover contract (all timers live in Navbar):
//   Categories button  onMouseEnter → onCatOpen   (cancel timer, open)
//   Categories button  onMouseLeave → onCatClose  (start 200ms close timer)
//   Panel              onMouseEnter → onCatOpen   (cancel timer — keeps open)
//   Panel              onMouseLeave → onCatClose  (start 200ms close timer)
//   Browse/Messages    onMouseEnter → onOtherNavHover (close immediately)
// ─────────────────────────────────────────────────────────────────────────────

function SpotlightCenterNav({ isAuthenticated, glassy, catOpen, onCatOpen, onCatClose, onOtherNavHover }) {
  const { ref: navRef, currentX: spotX, hovered } = useSpotlight('--c-spot-x')

  const ambienceX = useRef(0)
  const ringX     = useRef(0)
  const ringW     = useRef(60)
  const isFirst   = useRef(true)
  const location  = useLocation()

  const activeIndex = useMemo(() => CENTER_NAV.findIndex(item => {
    if (!item.to) return false
    if (item.end) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }), [location.pathname])

  const measureItem = useCallback((idx) => {
    const nav = navRef.current
    if (!nav) return null
    const el = nav.querySelector(`[data-item="${idx}"]`)
    if (!el) return null
    const { left: nL }        = nav.getBoundingClientRect()
    const { left: eL, width } = el.getBoundingClientRect()
    return { x: eL - nL, cx: eL - nL + width / 2, w: width }
  }, []) // eslint-disable-line

  useLayoutEffect(() => {
    if (activeIndex < 0) return
    const nav = navRef.current
    const m   = measureItem(activeIndex)
    if (!nav || !m) return
    ambienceX.current = m.cx; ringX.current = m.x; ringW.current = m.w
    spotX.current     = m.cx
    nav.style.setProperty('--c-amb-x',  `${m.cx}px`)
    nav.style.setProperty('--c-ring-x', `${m.x}px`)
    nav.style.setProperty('--c-ring-w', `${m.w}px`)
    nav.style.setProperty('--c-spot-x', `${m.cx}px`)
  }, []) // eslint-disable-line

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    if (activeIndex < 0) return
    const nav = navRef.current
    const m   = measureItem(activeIndex)
    if (!nav || !m) return
    animate(ambienceX.current, m.cx, {
      type: 'spring', stiffness: 240, damping: 28,
      onUpdate: v => { ambienceX.current = v; nav.style.setProperty('--c-amb-x', `${v}px`) },
    })
    animate(ringX.current, m.x, {
      type: 'spring', stiffness: 260, damping: 26,
      onUpdate: v => { ringX.current = v; nav.style.setProperty('--c-ring-x', `${v}px`) },
    })
    animate(ringW.current, m.w, {
      type: 'spring', stiffness: 260, damping: 26,
      onUpdate: v => { ringW.current = v; nav.style.setProperty('--c-ring-w', `${v}px`) },
    })
  }, [activeIndex]) // eslint-disable-line

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const onLeave = () => {
      if (activeIndex < 0) return
      const m = measureItem(activeIndex)
      if (!m) return
      animate(spotX.current, m.cx, {
        type: 'spring', stiffness: 200, damping: 22,
        onUpdate: v => { spotX.current = v; nav.style.setProperty('--c-spot-x', `${v}px`) },
      })
    }
    nav.addEventListener('mouseleave', onLeave)
    return () => nav.removeEventListener('mouseleave', onLeave)
  }, [activeIndex]) // eslint-disable-line

  const textActive  = glassy ? 'text-white'          : 'text-indigo-600'
  const textDefault = glassy ? 'text-white/60'       : 'text-gray-600'
  const textHover   = glassy ? 'hover:text-white/90' : 'hover:text-gray-900'
  const ringBorder  = glassy ? 'border-white/[0.30]' : 'border-indigo-200'
  const ringBg      = glassy ? 'bg-white/[0.12]'     : 'bg-indigo-50/80'
  const spotBg      = glassy
    ? 'radial-gradient(80px circle at var(--c-spot-x,50%) 50%, rgba(255,255,255,0.18) 0%, transparent 70%)'
    : 'radial-gradient(80px circle at var(--c-spot-x,50%) 50%, rgba(99,102,241,0.10) 0%, transparent 70%)'
  const ambColor = glassy ? 'rgba(255,255,255,0.82)' : 'rgba(99,102,241,0.82)'

  return (
    <div ref={navRef} className="relative flex items-center h-full px-2">

      {/* Layer 1 — spotlight */}
      <div aria-hidden className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{ opacity: hovered ? 1 : 0, background: spotBg }} />

      {/* Layer 2 — active ring */}
      <div aria-hidden className={`pointer-events-none absolute top-1.5 rounded-full border ${ringBorder} ${ringBg} transition-opacity duration-300`}
        style={{ height: 'calc(100% - 12px)', opacity: activeIndex >= 0 ? 1 : 0, left: 'var(--c-ring-x,0px)', width: 'var(--c-ring-w,60px)' }} />

      {/* Layer 3 — nav items */}
      {CENTER_NAV.map((item, idx) => {
        if (item.protected && !isAuthenticated) return null
        const isActive = idx === activeIndex
        const cls =
          'relative z-10 flex items-center gap-1.5 px-3.5 h-8 text-sm font-medium rounded-full ' +
          'transition-colors duration-150 whitespace-nowrap ' +
          (isActive ? textActive : `${textDefault} ${textHover}`)

        if (item.isDropdown) {
          return (
            <div
              key="cat"
              data-item={idx}
              className="relative flex items-center"
              onMouseEnter={onCatOpen}
              onMouseLeave={onCatClose}
            >
              <button
                onClick={() => catOpen ? onOtherNavHover() : onCatOpen()}
                className={cls + (catOpen ? ` !${textActive}` : '')}
              >
                <item.Icon className="w-[15px] h-[15px] flex-shrink-0" strokeWidth={1.75} />
                {item.label}
                <ChevronDown
                  className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`}
                  strokeWidth={2.5}
                />
              </button>
            </div>
          )
        }

        return (
          <div
            key={item.to}
            data-item={idx}
            className="flex items-center"
            onMouseEnter={() => { if (catOpen) onOtherNavHover() }}
          >
            <NavLink to={item.to} end={item.end} className={cls}>
              <item.Icon className="w-[15px] h-[15px] flex-shrink-0" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          </div>
        )
      })}

      {/* Layer 4 — ambience underline */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-px transition-opacity duration-300"
        style={{
          opacity: activeIndex >= 0 ? 1 : 0,
          background: `radial-gradient(56px circle at var(--c-amb-x,50%) 0%, ${ambColor} 0%, transparent 100%)`,
        }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SpotlightIconGroup — [Bell] [Heart] in RIGHT zone Group 1
// ─────────────────────────────────────────────────────────────────────────────

function SpotlightIconGroup({ glassy }) {
  const { ref: navRef, hovered } = useSpotlight('--ig-spot-x')
  const indX = useRef(0)
  const indW = useRef(36)
  const [indVisible, setIndVisible] = useState(false)
  const { unreadCount } = useNotificationStore()

  const springToItem = useCallback(el => {
    const nav = navRef.current
    if (!el || !nav) return
    const { left: nL }        = nav.getBoundingClientRect()
    const { left: eL, width } = el.getBoundingClientRect()
    animate(indX.current, eL - nL, {
      type: 'spring', stiffness: 380, damping: 30,
      onUpdate: v => { indX.current = v; nav.style.setProperty('--ig-ind-x', `${v}px`) },
    })
    animate(indW.current, width, {
      type: 'spring', stiffness: 380, damping: 30,
      onUpdate: v => { indW.current = v; nav.style.setProperty('--ig-ind-w', `${v}px`) },
    })
    setIndVisible(true)
  }, []) // eslint-disable-line

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const hide = () => setIndVisible(false)
    nav.addEventListener('mouseleave', hide)
    return () => nav.removeEventListener('mouseleave', hide)
  }, []) // eslint-disable-line

  const enter = e => springToItem(e.currentTarget)

  const iconCls = glassy ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-800'
  const spotBg  = glassy
    ? 'radial-gradient(60px circle at var(--ig-spot-x,50%) 50%, rgba(255,255,255,0.16) 0%, transparent 70%)'
    : 'radial-gradient(60px circle at var(--ig-spot-x,50%) 50%, rgba(0,0,0,0.04) 0%, transparent 70%)'
  const indBg = glassy ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)'

  return (
    <div ref={navRef} className="relative flex items-center h-full px-1.5">
      <div aria-hidden className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{ opacity: hovered ? 1 : 0, background: spotBg }} />
      <div aria-hidden className="pointer-events-none absolute top-1.5 rounded-full transition-opacity duration-150"
        style={{ height: 'calc(100% - 12px)', opacity: indVisible ? 1 : 0, left: 'var(--ig-ind-x,0px)', width: 'var(--ig-ind-w,36px)', background: indBg }} />

      {/* Bell */}
      <button onMouseEnter={enter} title="Notifications"
        className={`relative z-10 flex w-9 h-9 items-center justify-center rounded-full transition-colors duration-150 ${iconCls}`}
      >
        <Bell className="w-[17px] h-[17px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className={`
            absolute top-[5px] right-[5px] min-w-[14px] h-[14px]
            text-[9px] font-bold leading-none
            flex items-center justify-center
            rounded-full bg-red-500 text-white px-0.5
            border ${glassy ? 'border-white/20' : 'border-white'}
          `}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Heart — data-heart-target so ListingCard can fly the thumbnail here */}
      <Link
        to="/dashboard/saved"
        onMouseEnter={enter}
        title="Saved listings"
        data-heart-target
        className={`relative z-10 flex w-9 h-9 items-center justify-center rounded-full transition-colors duration-150 ${iconCls}`}
      >
        <Heart className="w-[17px] h-[17px]" strokeWidth={1.75} />
      </Link>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoriesPanel
//
// The pt-2.5 transparent bridge is critical: it makes the panel's hit-region
// start exactly at the bottom of the CENTER capsule so there is no pixel gap
// for the mouse to "fall through". When the mouse crosses from the button's
// onMouseLeave into this pt-2.5 zone, onPanelEnter fires and cancels the
// close timer before it can expire.
// ─────────────────────────────────────────────────────────────────────────────

function CategoriesPanel({ open, onPanelEnter, onPanelLeave, onClose }) {
  return (
    <div
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
      className={[
        // pt-1.5 transparent bridge keeps hover continuous between capsule and panel
        'absolute top-full left-1/2 -translate-x-1/2 pt-1.5 w-64 z-50 origin-top',
        'transition-all duration-200 ease-out',
        open
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 scale-[0.97] -translate-y-1 pointer-events-none',
      ].join(' ')}
    >
      <div className="bg-white/[0.96] backdrop-blur-[24px] border border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.14),0_0_0_0.5px_rgba(0,0,0,0.06)] rounded-2xl p-2.5">
        <div className="grid grid-cols-2 gap-0.5">
          {categories.map(cat => {
            const Icon = CAT_ICONS[cat.id] ?? Package
            return (
              <Link
                key={cat.id}
                to={`/listings?cat=${cat.id}`}
                onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-150 group"
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-indigo-500 transition-colors" strokeWidth={1.75} />
                {cat.name}
              </Link>
            )
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-black/[0.06]">
          <Link
            to="/listings"
            onClick={onClose}
            className="flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Browse all listings
            <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileMenu — AnimatePresence for smooth open/close
// ─────────────────────────────────────────────────────────────────────────────

const PROFILE_LINKS = [
  { to: '/dashboard/profile',  label: 'Profile',        Icon: User            },
  { to: '/dashboard',          label: 'Dashboard',      Icon: LayoutDashboard },
  { to: '/dashboard/listings', label: 'My Listings',    Icon: Tag             },
  { to: '/dashboard/saved',    label: 'Saved Listings', Icon: Bookmark        },
  { to: '/chat',               label: 'Messages',       Icon: MessageCircle   },
  { to: '/dashboard/settings', label: 'Settings',       Icon: Settings        },
]

function ProfileMenu({ open, onClose, user, avatarSrc }) {
  const navigate      = useNavigate()
  const { clearAuth } = useAuthStore()
  const ref           = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const handleLogout = () => { clearAuth(); onClose(); navigate('/login') }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.97, y: -6 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.97, y: -6 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className="absolute right-0 top-[calc(100%+6px)] w-56 z-50 pointer-events-auto bg-white/[0.96] backdrop-blur-[24px] border border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.14),0_0_0_0.5px_rgba(0,0,0,0.06)] rounded-2xl overflow-hidden"
        >
          {/* User strip */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.06] bg-black/[0.02]">
            <img src={avatarSrc} alt={user?.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-black/[0.06] flex-shrink-0"
              onError={e => { e.currentTarget.src = defaultAvatar }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>

          {/* Links */}
          <div className="py-1.5">
            {PROFILE_LINKS.map(l => (
              <Link key={l.to} to={l.to} onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-black/[0.04] hover:text-gray-900 transition-colors"
              >
                <l.Icon className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
                {l.label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-black/[0.06] p-2">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50/80 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
              Sign Out
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NavDrawer — mobile
// ─────────────────────────────────────────────────────────────────────────────

const DRAWER_LINKS = [
  { to: '/',                   label: 'Home',        Icon: LayoutGrid,      protected: false },
  { to: '/listings',           label: 'Browse',      Icon: LayoutGrid,      protected: false },
  { to: '/dashboard',          label: 'Dashboard',   Icon: LayoutDashboard, protected: true  },
  { to: '/dashboard/listings', label: 'My Listings', Icon: Tag,             protected: true  },
  { to: '/chat',               label: 'Messages',    Icon: MessageCircle,   protected: true  },
  { to: '/dashboard/saved',    label: 'Saved',       Icon: Bookmark,        protected: true  },
  { to: '/dashboard/profile',  label: 'Profile',     Icon: User,            protected: true  },
  { to: '/dashboard/settings', label: 'Settings',    Icon: Settings,        protected: true  },
]

function NavDrawer({ open, onClose }) {
  const { user, isAuthenticated, clearAuth } = useAuthStore()
  const navigate  = useNavigate()
  const avatarSrc = user?.profileImage?.trim() || defaultAvatar
  const handleLogout = () => { clearAuth(); onClose(); navigate('/login') }
  const links = DRAWER_LINKS.filter(l => !l.protected || isAuthenticated)

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-72 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out bg-white/90 backdrop-blur-[24px] border-l border-black/[0.06] ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
          <Link to="/" onClick={onClose} className="text-lg font-black text-indigo-600 tracking-tight">Xchange</Link>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-black/[0.05] transition-all">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.04] cursor-pointer hover:bg-black/[0.03] transition-colors"
            onClick={() => { navigate('/dashboard/profile'); onClose() }}>
            <img src={avatarSrc} alt={user?.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-100 flex-shrink-0"
              onError={e => { e.currentTarget.src = defaultAvatar }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={2} />
          </div>
        )}

        <div className="px-5 py-3 border-b border-black/[0.04]">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => {
              const Icon = CAT_ICONS[cat.id] ?? Package
              return (
                <Link key={cat.id} to={`/listings?cat=${cat.id}`} onClick={onClose}
                  className="flex items-center gap-1.5 text-xs text-gray-600 bg-black/[0.04] hover:bg-indigo-50 hover:text-indigo-700 border border-black/[0.06] hover:border-indigo-200 px-2.5 py-1.5 rounded-full transition-all">
                  <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                  {cat.name}
                </Link>
              )
            })}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-indigo-50/80 hover:text-indigo-700 transition-all">
              <l.Icon className="w-4 h-4 flex-shrink-0 text-gray-400" strokeWidth={1.75} />
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-black/[0.05] p-4 space-y-2">
          {isAuthenticated ? (
            <>
              <Link to="/create-listing" onClick={onClose}
                className="flex items-center justify-center gap-2 w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                <Plus className="w-4 h-4" strokeWidth={2.5} />Post a Listing
              </Link>
              <button onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full h-10 border border-black/[0.08] text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-medium rounded-xl transition-all">
                <LogOut className="w-4 h-4" strokeWidth={1.75} />Sign Out
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login"    onClick={onClose} className="flex-1 flex items-center justify-center h-10 border border-black/[0.08] text-gray-700 text-sm font-medium rounded-xl hover:bg-black/[0.04] transition">Login</Link>
              <Link to="/register" onClick={onClose} className="flex-1 flex items-center justify-center h-10 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition">Register</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Navbar
//
// Category dropdown fix:
//   catOpen is owned HERE — single source of truth, no duplicate state.
//   openCat()    → clear timer + open immediately
//   closeCat()   → close with 220ms delay (for column mouseleave)
//   closeCatNow() → close immediately (for hovering non-cat nav items)
//
//   CENTER column div uses pb-[260px] -mb-[260px] to extend its bounding box
//   260px below the capsule. This makes the panel + the gap between capsule
//   and panel all part of ONE hover region. Mouse leaving the column div fires
//   closeCat() whether it leaves from the top, sides, or bottom.
// ─────────────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { user, isAuthenticated } = useAuthStore()
  const { fetchNotifications }    = useNotificationStore()
  const location = useLocation()
  const isHome   = location.pathname === '/'

  const [scrolled,    setScrolled]    = useState(!isHome)
  const [profileOpen, setProfileOpen] = useState(false)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [catOpen,     setCatOpen]     = useState(false)
  const catTimer = useRef(null)

  // Fetch unread count once when the user is authenticated
  useEffect(() => {
    if (isAuthenticated) fetchNotifications()
  }, [isAuthenticated]) // eslint-disable-line

  useEffect(() => {
    if (!isHome) { setScrolled(true); return }
    const handler = () => setScrolled(window.scrollY > 420)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [isHome])

  const glassy = isHome && !scrolled

  const avatarSrc = user?.profileImage?.trim() || defaultAvatar

  // ── Category panel — single timer, single state ──────────────────────────
  // openCat     : cancel any pending close, open immediately
  // closeCat    : start a 200ms debounced close (gives mouse time to reach panel)
  // closeCatNow : cancel pending close AND close immediately
  const openCat     = () => { clearTimeout(catTimer.current); setCatOpen(true) }
  const closeCat    = () => { catTimer.current = setTimeout(() => setCatOpen(false), 200) }
  const closeCatNow = () => { clearTimeout(catTimer.current); setCatOpen(false) }

  const glass     = getGlass(glassy)
  const ringHover = getRingH(glassy)
  const ringAct   = getRingA(glassy)

  const logoCls = glassy ? 'text-white/90 hover:text-white' : 'text-indigo-600 hover:text-indigo-700'

  const avatarRingCls = profileOpen
    ? (glassy ? 'ring-white/60 scale-105' : 'ring-indigo-400 scale-105')
    : (glassy ? 'ring-white/[0.22] hover:ring-white/[0.50]' : 'ring-black/[0.10] hover:ring-indigo-300')

  const postCls = glassy
    ? 'bg-white/[0.14] hover:bg-white/[0.22] border border-white/[0.20] text-white'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'

  const menuColor = glassy ? 'text-white/70' : 'text-gray-700'

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 pointer-events-none">
        <div className={MAX_W}>
          <div className="pt-4 pb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4 lg:gap-5">

            {/* ══ LEFT — Logo ══ */}
            <div className="flex items-center">
              <div className={`${glass} ${H_SIDE} ${ringHover} rounded-full flex items-center px-5 pointer-events-auto transition-all duration-500`}>
                <Link to="/" className={`text-[17px] font-black tracking-tight transition-colors duration-500 select-none ${logoCls}`}>
                  Xchange
                </Link>
              </div>
            </div>

            {/* ══ CENTER — Spotlight nav ══ */}
            <div className="relative flex justify-center">
              <div className={`${glass} ${H_CENTER} ${ringHover} rounded-full overflow-hidden hidden md:flex items-center pointer-events-auto transition-all duration-500`}>
                <SpotlightCenterNav
                  isAuthenticated={isAuthenticated}
                  glassy={glassy}
                  catOpen={catOpen}
                  onCatOpen={openCat}
                  onCatClose={closeCat}
                  onOtherNavHover={closeCatNow}
                />
              </div>
              {/*
               * CategoriesPanel sits at top-full of this column div.
               * Its own onMouseEnter/onMouseLeave carry the shared catTimer
               * so the panel and the trigger button share ONE close timer.
               */}
              <CategoriesPanel
                open={catOpen}
                onPanelEnter={openCat}
                onPanelLeave={closeCat}
                onClose={closeCatNow}
              />
            </div>

            {/* ══ RIGHT — 3 groups ══ */}
            <div className="relative flex items-center justify-end gap-2">

              {/* Group 1: [Bell][Heart] */}
              {isAuthenticated && (
                <div className={`${glass} ${H_SIDE} ${ringHover} rounded-full hidden sm:flex items-center overflow-hidden pointer-events-auto transition-all duration-500`}>
                  <SpotlightIconGroup glassy={glassy} />
                </div>
              )}

              {/* Group 2: Post Listing */}
              {isAuthenticated && (
                <Link
                  to="/create-listing"
                  className={`hidden sm:flex items-center gap-1.5 ${H_SIDE} px-4 rounded-full text-sm font-semibold pointer-events-auto transition-all duration-500 hover:-translate-y-px active:translate-y-0 ${postCls}`}
                >
                  <Plus className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
                  Post Listing
                </Link>
              )}

              {/* Unauthenticated: Login + Register */}
              {!isAuthenticated && (
                <div className="hidden sm:flex items-center gap-2 pointer-events-auto">
                  <Link to="/login"
                    className={`flex items-center h-9 px-3.5 text-sm font-medium rounded-full transition-all duration-300 ${
                      glassy ? 'text-white/70 hover:text-white hover:bg-white/[0.10]' : 'text-gray-600 hover:text-indigo-600'
                    }`}
                  >Login</Link>
                  <Link to="/register"
                    className={`flex items-center h-9 px-4 text-sm font-bold rounded-full transition-all duration-300 ${postCls}`}
                  >Register</Link>
                </div>
              )}

              {/* Group 3: Avatar */}
              {isAuthenticated && (
                <div className="relative pointer-events-auto">
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setProfileOpen(v => !v)}
                    title={user?.name}
                    className={`w-9 h-9 rounded-full overflow-hidden ring-2 transition-all duration-200 flex-shrink-0 ${avatarRingCls}`}
                  >
                    <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.src = defaultAvatar }} />
                  </button>
                </div>
              )}

              {/* Hamburger — mobile */}
              <div className={`${glass} ${H_SIDE} ${ringHover} rounded-full md:hidden flex items-center px-1.5 pointer-events-auto transition-all duration-500`}>
                <button onClick={() => setDrawerOpen(true)} className="flex w-8 h-8 items-center justify-center rounded-full transition-colors">
                  <Menu className={`w-[18px] h-[18px] ${menuColor}`} strokeWidth={2} />
                </button>
              </div>

              {/* ProfileMenu — outside overflow, positioned relative to RIGHT column */}
              {isAuthenticated && (
                <ProfileMenu
                  open={profileOpen}
                  onClose={() => setProfileOpen(false)}
                  user={user}
                  avatarSrc={avatarSrc}
                />
              )}
            </div>

          </div>
        </div>
      </div>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
