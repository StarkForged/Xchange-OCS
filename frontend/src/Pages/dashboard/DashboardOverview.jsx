import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import { getMyListingsAPI } from '../../api/listings.api'
import { getChatsAPI } from '../../api/chat.api'
import RecentlyViewed from '../../components/listings/RecentlyViewed'
import RecommendedListings from '../../components/listings/RecommendedListings'
import defaultImage from '../../assets/images/products/iphone13.jpg'

const timeAgo = (d) => {
  if (!d) return ''
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

const formatPrice = (p) => p?.amount != null ? `₹${p.amount.toLocaleString('en-IN')}` : '—'

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, from, to, loading }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${from} ${to} p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1.5">{label}</p>
          <p className="text-3xl font-black text-white leading-none">
            {loading
              ? <span className="inline-block w-10 h-7 bg-white/20 rounded-lg animate-pulse" />
              : value
            }
          </p>
          <p className="text-xs text-white/60 mt-1.5 font-medium">{sub}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
          {icon}
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-10 -right-2 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
    </div>
  )
}

// ── Quick action card ──────────────────────────────────────────────────────

function QuickActionCard({ to, label, description, icon, accent }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={`w-11 h-11 rounded-xl ${accent} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <svg
        className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ── Profile completion ─────────────────────────────────────────────────────

function ProfileCompletion({ user }) {
  const pct = user?.profileCompletion ?? 0

  const checks = [
    { label: 'Name added',         done: !!user?.name },
    { label: 'Email verified',     done: !!user?.email },
    { label: 'Profile photo',      done: !!(user?.profileImage && !user.profileImage.includes('default')) },
    { label: 'Phone number',       done: !!user?.phone },
    { label: 'Bio / About',        done: !!user?.bio },
    { label: 'Location set',       done: !!user?.location },
    { label: 'First listing',      done: (user?.trustScore ?? 0) > 30 },
  ]

  const computed = pct || Math.round((checks.filter((c) => c.done).length / checks.length) * 100)
  const color    = computed < 40 ? 'bg-rose-500' : computed < 70 ? 'bg-amber-500' : 'bg-emerald-500'
  const label    = computed < 40 ? 'text-rose-600' : computed < 70 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Profile Strength</h3>
          <p className="text-xs text-gray-400 mt-0.5">Complete your profile to build trust</p>
        </div>
        <span className={`text-2xl font-black ${label}`}>{computed}%</span>
      </div>

      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${computed}%` }}
        />
      </div>

      <div className="space-y-2.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2.5">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${c.done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              {c.done
                ? <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              }
            </div>
            <span className={`text-xs font-medium ${c.done ? 'text-gray-700' : 'text-gray-400'}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {computed < 100 && (
        <Link
          to="/dashboard/profile"
          className="mt-4 flex items-center justify-center h-9 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-colors duration-150"
        >
          Complete Profile →
        </Link>
      )}
    </div>
  )
}

// ── Reputation overview section ────────────────────────────────────────────

function ReputationSection({ user }) {
  const score   = user?.trustScore ?? 0
  const badges  = user?.badges ?? []
  const metrics = user?.sellerMetrics
  const isGhost = user?.ghostRisk?.flagged

  const tier =
    score >= 90 ? { label: 'Top Seller', color: 'text-yellow-800', bg: 'from-yellow-400 to-amber-500' }
    : score >= 80 ? { label: 'Trusted',   color: 'text-amber-700',  bg: 'from-amber-500 to-orange-500' }
    : score >= 50 ? { label: 'Building',  color: 'text-emerald-700', bg: 'from-emerald-500 to-teal-500' }
    : score > 0   ? { label: 'New',       color: 'text-sky-700',    bg: 'from-sky-500 to-blue-500'     }
    :               { label: 'New Member', color: 'text-gray-500',   bg: 'from-gray-400 to-gray-500'    }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">Reputation Overview</h2>
        <Link to="/dashboard/profile" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors flex items-center gap-1">
          View details
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Ghost risk alert */}
      {isGhost && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">Ghost Seller Risk</p>
            <p className="text-xs text-amber-700 mt-0.5">Your listings may show an "inactive seller" warning to buyers.</p>
          </div>
          <Link to="/dashboard/messages" className="flex-shrink-0 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors">
            Reply now
          </Link>
        </div>
      )}

      {/* Reputation cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* Trust score tile */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tier.bg} p-4 text-white col-span-2 sm:col-span-1`}>
          <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Trust Score</p>
          <p className="text-3xl font-black leading-none">{score}</p>
          <p className="text-xs text-white/70 mt-1">{tier.label}</p>
          <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />
        </div>

        {/* Badges tile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Badges</p>
          <p className="text-3xl font-black text-gray-900 leading-none">{badges.length}</p>
          <p className="text-xs text-gray-400 mt-1">earned</p>
        </div>

        {/* Response rate tile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Response</p>
          {metrics?.totalInquiries ? (
            <>
              <p className={`text-3xl font-black leading-none ${
                metrics.responseRate >= 80 ? 'text-emerald-600'
                : metrics.responseRate >= 50 ? 'text-amber-600'
                : 'text-rose-600'
              }`}>
                {metrics.responseRate}%
              </p>
              <p className="text-xs text-gray-400 mt-1">rate</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-black text-gray-300 leading-none">—</p>
              <p className="text-xs text-gray-400 mt-1">no data yet</p>
            </>
          )}
        </div>

        {/* Inquiries tile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Inquiries</p>
          <p className="text-3xl font-black text-gray-900 leading-none">
            {metrics?.totalInquiries ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">received</p>
        </div>

        {/* Reviews tile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reviews</p>
          {(user?.reviewStats?.reviewCount ?? 0) > 0 ? (
            <>
              <p className="text-3xl font-black text-amber-500 leading-none">
                {user.reviewStats.averageRating}
              </p>
              <p className="text-xs text-gray-400 mt-1">avg · {user.reviewStats.reviewCount} total</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-black text-gray-300 leading-none">—</p>
              <p className="text-xs text-gray-400 mt-1">no reviews</p>
            </>
          )}
        </div>

        {/* Completed Deals tile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Deals</p>
          <p className="text-3xl font-black text-emerald-600 leading-none">
            {user?.reviewStats?.completedDeals ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">completed</p>
        </div>

      </div>

      {/* Badge strip */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.slice(0, 5).map((b) => (
            <span
              key={b.id}
              title={b.description}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600"
            >
              {b.label}
            </span>
          ))}
          {badges.length > 5 && (
            <Link
              to="/dashboard/profile"
              className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 self-center transition-colors"
            >
              +{badges.length - 5} more
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const { user } = useAuthStore()
  const [listings, setListings] = useState([])
  const [chats,    setChats]    = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [lr, cr] = await Promise.all([getMyListingsAPI(), getChatsAPI()])
        if (!cancelled) {
          setListings(lr.listings || [])
          setChats(cr.chats || [])
        }
      } catch {
        // silent — stats are non-critical, UI shows empty state gracefully
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const totalListings  = listings.length
  const activeListings = listings.filter((l) => l.status === 'active').length
  const totalChats     = chats.length
  const recentListings = listings.slice(0, 3)

  return (
    <div className="space-y-7 max-w-6xl">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-400 mt-1">
            Your marketplace activity at a glance
          </p>
        </div>
        <Link
          to="/create-listing"
          className="hidden sm:flex items-center gap-1.5 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 shadow-sm hover:shadow-md"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Post Listing
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="My Listings"
          value={totalListings}
          sub="total posted"
          from="from-indigo-500" to="to-violet-600"
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label="Active"
          value={activeListings}
          sub="live right now"
          from="from-emerald-500" to="to-teal-600"
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Messages"
          value={totalChats}
          sub="conversations"
          from="from-sky-500" to="to-blue-600"
          loading={loading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
        <StatCard
          label="Trust Score"
          value={user?.trustScore ?? 0}
          sub="out of 100"
          from="from-amber-500" to="to-orange-500"
          loading={false}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
      </div>

      {/* Reputation overview */}
      <ReputationSection user={user} />

      {/* Recently viewed — horizontal scroll strip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <RecentlyViewed maxItems={8} />
      </div>

      {/* Recommended listings */}
      <RecommendedListings maxItems={4} label="Picks For You" />

      {/* Mid row: Quick actions + Profile completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Quick actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Quick Actions</h2>
          <QuickActionCard
            to="/create-listing"
            label="Post a New Listing"
            description="List something you'd like to sell"
            accent="bg-indigo-50 text-indigo-600"
            icon={
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            }
          />
          <QuickActionCard
            to="/listings"
            label="Browse Marketplace"
            description="Discover items from other sellers"
            accent="bg-emerald-50 text-emerald-600"
            icon={
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          <QuickActionCard
            to="/dashboard/messages"
            label="View Messages"
            description={`${totalChats} active conversation${totalChats !== 1 ? 's' : ''}`}
            accent="bg-sky-50 text-sky-600"
            icon={
              <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />
          <QuickActionCard
            to="/dashboard/reviews"
            label="My Reviews"
            description={`${user?.reviewStats?.reviewCount ?? 0} review${(user?.reviewStats?.reviewCount ?? 0) !== 1 ? 's' : ''} received`}
            accent="bg-amber-50 text-amber-600"
            icon={
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
        </div>

        <ProfileCompletion user={user} />
      </div>

      {/* Recent listings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Recent Listings</h2>
          <Link
            to="/dashboard/listings"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors flex items-center gap-1"
          >
            View all
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="aspect-[4/3] bg-gray-100 rounded-xl mb-3" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && recentListings.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No listings yet</p>
            <p className="text-xs text-gray-400 mb-5">Your posted listings will appear here</p>
            <Link
              to="/create-listing"
              className="inline-flex items-center gap-1.5 h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Post your first listing
            </Link>
          </div>
        )}

        {!loading && recentListings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recentListings.map((listing) => (
              <Link
                key={listing._id}
                to={`/listings/${listing._id}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img
                    src={listing.images?.[0] || defaultImage}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                  />
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1.5">{listing.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-600">{formatPrice(listing.price)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      listing.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : listing.status === 'sold'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">{timeAgo(listing.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
