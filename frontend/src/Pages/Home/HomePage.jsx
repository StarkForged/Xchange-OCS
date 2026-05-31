import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Smartphone, Car, Building2, Monitor, Armchair, Briefcase, Bike,
  ChevronRight,
} from 'lucide-react'
import useAuthStore from '../../store/auth.Store'
import { getListingsAPI } from '../../api/listings.api'
import { categories } from '../../mock/categories'
import ListingCard from '../../components/listings/ListingCard'

// ── Constants ──────────────────────────────────────────────────────────────

const CONTAINER = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'

const CAT_META = {
  mobiles:     { Icon: Smartphone, bg: 'bg-blue-50',    iconColor: 'text-blue-500',    hoverBg: 'group-hover:bg-blue-100'    },
  cars:        { Icon: Car,        bg: 'bg-rose-50',    iconColor: 'text-rose-500',    hoverBg: 'group-hover:bg-rose-100'    },
  properties:  { Icon: Building2,  bg: 'bg-emerald-50', iconColor: 'text-emerald-500', hoverBg: 'group-hover:bg-emerald-100' },
  electronics: { Icon: Monitor,    bg: 'bg-purple-50',  iconColor: 'text-purple-500',  hoverBg: 'group-hover:bg-purple-100'  },
  furniture:   { Icon: Armchair,   bg: 'bg-amber-50',   iconColor: 'text-amber-500',   hoverBg: 'group-hover:bg-amber-100'   },
  jobs:        { Icon: Briefcase,  bg: 'bg-indigo-50',  iconColor: 'text-indigo-500',  hoverBg: 'group-hover:bg-indigo-100'  },
  bikes:       { Icon: Bike,       bg: 'bg-orange-50',  iconColor: 'text-orange-500',  hoverBg: 'group-hover:bg-orange-100'  },
}

const POPULAR_SEARCHES = [
  'iPhone 15', 'MacBook Air M2', 'Honda City', '2BHK Flat',
  'Royal Enfield', 'Office Chair', 'Sony Headphones', 'PlayStation 5',
]

const RECENT_KEY = 'xc_recent'

const HOW_IT_WORKS = [
  {
    emoji: '🔍',
    step: '01',
    title: 'Browse & Discover',
    desc: 'Explore thousands of listings across 7 categories. Powerful search and filters get you to the right listing fast.',
    accent: 'bg-indigo-50 text-indigo-600',
  },
  {
    emoji: '💬',
    step: '02',
    title: 'Connect Safely',
    desc: 'Message sellers directly through our built-in chat. Review trust scores and verified badges before meeting.',
    accent: 'bg-emerald-50 text-emerald-600',
  },
  {
    emoji: '🤝',
    step: '03',
    title: 'Deal with Confidence',
    desc: 'Trust scores, verified sellers, community ratings — all visible upfront so you always know who you\'re dealing with.',
    accent: 'bg-violet-50 text-violet-600',
  },
]

// ── Utilities ─────────────────────────────────────────────────────────────

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

function saveRecent(term, prev) {
  const next = [term, ...prev.filter(r => r !== term)].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  return next
}

// ── Hero Search ────────────────────────────────────────────────────────────

function HeroSearch() {
  const navigate     = useNavigate()
  const containerRef = useRef(null)
  const inputRef     = useRef(null)

  const [query,   setQuery]   = useState('')
  const [focused, setFocused] = useState(false)
  const [recent,  setRecent]  = useState(getRecent)

  const showDropdown = focused && (recent.length > 0 || POPULAR_SEARCHES.length > 0)

  // Close on outside click
  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const commit = useCallback((term) => {
    const q = (term ?? query).trim()
    setFocused(false)
    if (!q) { navigate('/listings'); return }
    const next = saveRecent(q, recent)
    setRecent(next)
    navigate(`/listings?q=${encodeURIComponent(q)}`)
    setQuery('')
  }, [query, recent, navigate])

  const handleKeyDown = e => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setFocused(false); inputRef.current?.blur() }
  }

  const pickSuggestion = (term) => {
    // onMouseDown + preventDefault keeps input focused, then we commit
    setQuery(term)
    commit(term)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">

      {/* Input bar */}
      <div
        className={`flex items-center bg-white rounded-2xl shadow-2xl shadow-indigo-950/25 transition-all duration-200 ${
          focused ? 'ring-2 ring-indigo-300/60 shadow-indigo-950/35' : ''
        }`}
      >
        <div className="flex items-center pl-4 flex-shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="What are you looking for?"
          className="flex-1 text-[15px] text-gray-800 placeholder-gray-400 outline-none bg-transparent py-3.5 px-3 min-w-0"
        />

        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors mr-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <button
          onClick={() => commit()}
          className="flex-shrink-0 m-1.5 h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all duration-150 shadow-sm hover:shadow-md"
        >
          Search
        </button>
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden z-20">

          {/* Recent */}
          {recent.length > 0 && (
            <div className="p-4 border-b border-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Searches</span>
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY) }}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map(r => (
                  <button
                    key={r}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pickSuggestion(r)}
                    className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200 hover:border-indigo-200 px-3 py-1.5 rounded-full transition-all duration-150"
                  >
                    <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular */}
          <div className="p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Popular Right Now</span>
            <div className="flex flex-wrap gap-2 mt-3">
              {POPULAR_SEARCHES.map(p => (
                <button
                  key={p}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pickSuggestion(p)}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-700 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 px-3 py-1.5 rounded-full transition-all duration-150"
                >
                  <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Category grid ──────────────────────────────────────────────────────────

function CategoryGrid() {
  return (
    <section className={`${CONTAINER} py-14`}>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Explore</p>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Browse Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Find exactly what you're looking for</p>
        </div>
        <Link
          to="/listings"
          className="hidden sm:flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
        >
          All listings
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {categories.map(cat => {
          const m = CAT_META[cat.id]
          if (!m) return null
          const { Icon, bg, iconColor, hoverBg } = m
          return (
            <Link
              key={cat.id}
              to={`/listings?cat=${cat.id}`}
              className="group flex flex-col items-center gap-3 p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-200 cursor-pointer"
            >
              <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${bg} ${hoverBg} flex items-center justify-center transition-colors duration-200 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} strokeWidth={1.75} />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-700 group-hover:text-gray-900 text-center leading-tight transition-colors">
                {cat.name}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// ── Listing skeleton ───────────────────────────────────────────────────────

function ListingSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-2.5">
        <div className="h-3.5 bg-gray-100 rounded-lg w-3/4" />
        <div className="h-5 bg-gray-100 rounded-lg w-1/3" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
      </div>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ label, title, subtitle, href, linkLabel = 'View all' }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        {label && <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-1">{label}</p>}
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {href && (
        <Link to={href} className="hidden sm:flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
          {linkLabel}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isAuthenticated } = useAuthStore()
  const [listings,        setListings]       = useState([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [totalCount,      setTotalCount]      = useState(null)

  useEffect(() => {
    let cancelled = false
    getListingsAPI({ sortBy: 'latest' })
      .then(({ listings: data }) => {
        if (!cancelled) {
          setListings(data || [])
          setTotalCount(data?.length ?? 0)
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoadingListings(false) })
    return () => { cancelled = true }
  }, [])

  const displayListings = listings.slice(0, 8)

  return (
    <div className="bg-white">

      {/* ════════════════════════════════════════════
          HERO — visual centerpiece of the page
      ════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 text-white overflow-hidden">

        {/* Background decoration */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-violet-500/20 pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-indigo-500/10 pointer-events-none" />

        <div className={`relative ${CONTAINER} py-16 sm:py-24`}>

          {/* Eyebrow */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/90 text-xs font-semibold px-4 py-1.5 rounded-full border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              Live marketplace · Updated every minute
            </span>
          </div>

          {/* Headline */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4">
              Discover. Connect.<br className="hidden sm:block" />
              <span className="text-indigo-200">Xchange.</span>
            </h1>
            <p className="text-indigo-200 text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
              Millions of listings. Verified sellers. Real deals near you.
            </p>
          </div>

          {/* ── THE SEARCH — visual anchor of the hero ── */}
          <HeroSearch />

          {/* Quick category shortcuts */}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-6">
            <span className="text-indigo-300 text-xs font-medium mr-1 hidden sm:inline">Popular:</span>
            {['Mobiles', 'Cars', 'Properties', 'Electronics'].map(label => {
              const cat = categories.find(c => c.name === label)
              const m   = cat ? CAT_META[cat.id] : null
              return cat && m ? (
                <Link
                  key={cat.id}
                  to={`/listings?cat=${cat.id}`}
                  className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 px-3 py-1.5 rounded-full transition-all duration-150 font-medium"
                >
                  <m.Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {cat.name}
                </Link>
              ) : null
            })}
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-10 sm:gap-16 flex-wrap mt-10 pt-8 border-t border-white/10">
            {[
              { value: totalCount != null ? `${totalCount}+` : '…', label: 'Active listings' },
              { value: `${categories.length}`,                        label: 'Categories'      },
              { value: '100%',                                         label: 'Free to list'    },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{s.value}</p>
                <p className="text-indigo-300 text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          CATEGORIES
      ════════════════════════════════════════════ */}
      <div className="border-b border-gray-100">
        <CategoryGrid />
      </div>

      {/* ════════════════════════════════════════════
          MARKETPLACE PULSE
      ════════════════════════════════════════════ */}
      <div className="bg-gray-50 border-b border-gray-100 py-3.5">
        <div className={`${CONTAINER} flex items-center justify-center gap-6 sm:gap-10 flex-wrap text-sm text-gray-500 font-medium`}>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            Listings updated just now
          </span>
          <span className="hidden sm:flex items-center gap-2">
            🔥 <span className="text-gray-700 font-semibold">Trending:</span> Mobiles &amp; Electronics
          </span>
          <span className="hidden sm:flex items-center gap-2">
            ⚡ New listings every hour
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          LATEST LISTINGS
      ════════════════════════════════════════════ */}
      <section className={`${CONTAINER} py-14`}>
        <SectionHeader
          label="Fresh Deals"
          title="Latest Listings"
          subtitle="Posted recently — check back often"
          href="/listings"
        />

        {loadingListings ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {[1,2,3,4,5,6,7,8].map(i => <ListingSkeleton key={i} />)}
          </div>
        ) : displayListings.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
              {displayListings.map(listing => (
                <ListingCard key={listing._id} listing={listing} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                to="/listings"
                className="inline-flex items-center gap-2 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold text-sm px-8 py-3 rounded-xl transition-all duration-200"
              >
                Browse all listings
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No listings yet</p>
            <p className="text-xs text-gray-400 mb-6">Be the first to post a listing!</p>
            <Link
              to="/create-listing"
              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Post a Listing
            </Link>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════ */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className={CONTAINER}>
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Simple process</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">How Xchange works</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
              A marketplace built around trust, transparency, and real transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={item.step}
                className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden sm:block absolute top-10 -right-2.5 w-5 border-t-2 border-dashed border-gray-200 z-10" />
                )}
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl ${item.accent} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {item.emoji}
                  </div>
                  <span className="text-4xl font-black text-gray-100 select-none leading-none">{item.step}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TRUST SECTION
      ════════════════════════════════════════════ */}
      <section className={`${CONTAINER} py-16`}>
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 sm:p-12 text-white overflow-hidden relative">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-14 -left-10 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-5">
                🛡️ Trust-First Marketplace
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 leading-tight tracking-tight">
                Every seller has a visible trust score
              </h2>
              <p className="text-indigo-200 text-sm leading-relaxed mb-7">
                We built a trust scoring system so buyers always know who they're dealing with.
                Verify your profile and earn trust that converts.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  to="/dashboard/profile"
                  className="inline-flex items-center h-10 px-5 bg-white text-indigo-700 font-bold text-sm rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  Boost My Score
                </Link>
                <Link
                  to="/listings"
                  className="inline-flex items-center gap-1 text-white/90 text-sm font-semibold hover:text-white transition-colors"
                >
                  Browse listings
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Verified Sellers', value: '✓',   sub: 'Identity checks'    },
                { label: 'Trust Score',       value: '100', sub: 'Profile completion' },
                { label: 'Real Listings',     value: '0',   sub: 'Spam listings'      },
                { label: 'Free to Use',       value: '∞',   sub: 'No hidden charges'  },
              ].map(item => (
                <div
                  key={item.label}
                  className="bg-white/15 rounded-2xl p-4 text-center border border-white/10 hover:bg-white/20 transition-colors duration-150"
                >
                  <p className="text-2xl font-black text-white">{item.value}</p>
                  <p className="text-xs font-bold text-white/90 mt-1">{item.label}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SELLER CTA
      ════════════════════════════════════════════ */}
      <section className="bg-gray-50 border-t border-gray-100 py-16">
        <div className={`${CONTAINER} text-center`}>
          <div className="max-w-xl mx-auto">
            <div className="text-4xl mb-5">💸</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
              Have something to sell?
            </h2>
            <p className="text-gray-500 text-base mb-8 leading-relaxed">
              List your item for free in under 2 minutes. Reach thousands of buyers in your city.
              No fees. No middlemen. Just deals.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {isAuthenticated ? (
                <Link
                  to="/create-listing"
                  className="inline-flex items-center gap-2 h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Start Selling Free
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5"
                  >
                    Create Free Account
                  </Link>
                  <Link to="/listings" className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
                    Browse listings first →
                  </Link>
                </>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-5">Free forever · No credit card required · 2 min setup</p>
          </div>
        </div>
      </section>

    </div>
  )
}
