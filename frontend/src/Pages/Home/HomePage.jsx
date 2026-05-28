import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import { getListingsAPI } from '../../api/listings.api'
import { categories } from '../../mock/categories'
import ListingCard from '../../components/listings/ListingCard'

// ── Category icons ────────────────────────────────────────────────────────

const CATEGORY_META = {
  mobiles:    { emoji: '📱', color: 'bg-blue-50   text-blue-700   border-blue-100' },
  cars:       { emoji: '🚗', color: 'bg-rose-50   text-rose-700   border-rose-100' },
  properties: { emoji: '🏠', color: 'bg-green-50  text-green-700  border-green-100' },
  electronics:{ emoji: '💻', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  furniture:  { emoji: '🛋️', color: 'bg-amber-50  text-amber-700  border-amber-100' },
  jobs:       { emoji: '💼', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  bikes:      { emoji: '🏍️', color: 'bg-orange-50 text-orange-700 border-orange-100' },
}

const HOW_IT_WORKS = [
  {
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    title: 'Browse Listings',
    desc:  'Explore thousands of listings across categories. Use filters, search, and location to find exactly what you need.',
    step: '01',
  },
  {
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    title: 'Connect Safely',
    desc:  'Message sellers directly through our secure chat system. Check their trust score and verified badges before meeting.',
    step: '02',
  },
  {
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
    title: 'Deal with Confidence',
    desc:  'Our trust score system gives you real signals. Verified sellers, active history, and community ratings — all visible upfront.',
    step: '03',
  },
]

function ListingSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-5 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [heroSearch, setHeroSearch] = useState('')
  const [listings, setListings]     = useState([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [totalCount, setTotalCount] = useState(null)

  // Fetch latest 8 listings for the homepage grid
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

  const handleHeroSearch = (e) => {
    e.preventDefault()
    if (heroSearch.trim()) {
      navigate(`/listings?q=${encodeURIComponent(heroSearch.trim())}`)
    } else {
      navigate('/listings')
    }
  }

  const displayListings = listings.slice(0, 8)

  return (
    <div className="bg-white">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">

          {/* Headline */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/90 text-xs font-semibold px-4 py-1.5 rounded-full mb-5 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              Live marketplace · Updated every minute
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
              Buy & sell anything,<br className="hidden sm:block" /> near you.
            </h1>
            <p className="text-indigo-200 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Millions of listings. Verified sellers. Real deals at your doorstep.
            </p>
          </div>

          {/* Hero search — visible on mobile (desktop uses navbar search) */}
          <form onSubmit={handleHeroSearch} className="max-w-xl mx-auto mb-8 md:mb-6">
            <div className="flex gap-2 p-1.5 bg-white rounded-2xl shadow-xl">
              <div className="flex-1 flex items-center px-3 gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="What are you looking for?"
                  className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent py-2"
                />
              </div>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm flex-shrink-0">
                Search
              </button>
            </div>
          </form>

          {/* Marketplace stats */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
            {[
              { value: totalCount != null ? `${totalCount.toLocaleString()}+` : '…', label: 'Active listings' },
              { value: categories.length + '+', label: 'Categories' },
              { value: '100%', label: 'Free to list' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-indigo-300 text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CATEGORY EXPLORATION
      ══════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Browse Categories</h2>
          <Link to="/listings" className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            All listings →
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat.id] || { emoji: '🏷️', color: 'bg-gray-50 text-gray-700 border-gray-100' }
            return (
              <Link
                key={cat.id}
                to={`/listings?cat=${cat.id}`}
                className={`group flex flex-col items-center gap-2 p-3 rounded-2xl border ${meta.color} hover:scale-105 hover:shadow-md transition-all duration-200 cursor-pointer`}
              >
                <span className="text-2xl sm:text-3xl leading-none">{meta.emoji}</span>
                <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight">{cat.name}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          MARKETPLACE PULSE (activity signals)
      ══════════════════════════════════════════ */}
      <section className="bg-gray-50 border-y border-gray-100 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap text-sm text-gray-500 font-medium">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Listings updated just now
            </span>
            <span className="flex items-center gap-2">
              🔥 <span className="text-gray-700 font-semibold">Trending:</span> Mobiles &amp; Electronics
            </span>
            <span className="flex items-center gap-2">
              ⚡ New listings posted every hour
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LATEST LISTINGS
      ══════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Latest Listings</h2>
            <p className="text-sm text-gray-400 mt-0.5">Fresh deals posted recently</p>
          </div>
          <Link to="/listings" className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            View all →
          </Link>
        </div>

        {loadingListings ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <ListingSkeleton key={i} />)}
          </div>
        ) : displayListings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {displayListings.map(listing => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No listings yet</p>
            <p className="text-xs text-gray-400 mb-4">Be the first to post a listing!</p>
            <Link to="/create-listing" className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
              Post a Listing
            </Link>
          </div>
        )}

        {displayListings.length > 0 && (
          <div className="text-center mt-8">
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
        )}
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section className="bg-gray-50 border-y border-gray-100 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How Xchange works</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              A marketplace built around trust, transparency, and real transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-3xl font-black text-gray-100 select-none">{item.step}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TRUST SECTION
      ══════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 sm:p-12 text-white overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-12 -left-8 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4">
                🛡️ Trust-First Marketplace
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 leading-tight">
                Every seller has a visible trust score
              </h2>
              <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                We built a trust scoring system so buyers always know who they're dealing with. Verify your profile, complete your bio, and earn trust that converts.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link to="/dashboard/profile" className="bg-white text-indigo-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
                  Boost My Score
                </Link>
                <Link to="/listings" className="text-white/90 text-sm font-semibold hover:text-white transition-colors flex items-center gap-1">
                  Browse listings →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Verified Sellers',   value: '✓',   sub: 'Identity checks',     bg: 'bg-white/15' },
                { label: 'Trust Score',         value: '100', sub: 'Profile completion',   bg: 'bg-white/15' },
                { label: 'Real Listings',       value: '0',   sub: 'Spam listings',        bg: 'bg-white/15' },
                { label: 'Free to Use',         value: '∞',   sub: 'No hidden charges',    bg: 'bg-white/15' },
              ].map((item) => (
                <div key={item.label} className={`${item.bg} rounded-2xl p-4 text-center border border-white/10`}>
                  <p className="text-2xl font-black text-white">{item.value}</p>
                  <p className="text-xs font-bold text-white/90 mt-1">{item.label}</p>
                  <p className="text-[10px] text-white/60 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SELLER CTA
      ══════════════════════════════════════════ */}
      <section className="bg-gray-50 border-t border-gray-100 py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-4xl mb-4">💸</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
            Have something to sell?
          </h2>
          <p className="text-gray-500 text-base mb-8 max-w-lg mx-auto leading-relaxed">
            List your item for free in under 2 minutes. Reach thousands of buyers in your city.
            No fees. No middlemen. Just deals.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {isAuthenticated ? (
              <Link
                to="/create-listing"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Start Selling Free
              </Link>
            ) : (
              <>
                <Link to="/register" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-200">
                  Create Free Account
                </Link>
                <Link to="/listings" className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
                  Browse listings first →
                </Link>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4">Free forever · No credit card required · 2 min setup</p>
        </div>
      </section>

    </div>
  )
}
