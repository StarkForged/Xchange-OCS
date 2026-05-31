import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import { getProfileAPI } from '../../api/auth.api'
import { getMyListingsAPI } from '../../api/listings.api'
import defaultAvatar from '../../assets/images/default-avatar.jpg'

const timeAgo = (d) => {
  if (!d) return '—'
  const months = Math.floor((Date.now() - new Date(d)) / (30 * 86400000))
  if (months < 1) return 'This month'
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

const formatResponseTime = (ms) => {
  if (ms == null) return '—'
  if (ms < 3_600_000)    return `${Math.round(ms / 60_000)} min`
  if (ms < 86_400_000)   return `${Math.round(ms / 3_600_000)} hr`
  return `${Math.round(ms / 86_400_000)} day${Math.round(ms / 86_400_000) !== 1 ? 's' : ''}`
}

// ── Badge icon map ─────────────────────────────────────────────────────────────

const BADGE_ICONS = {
  new_seller: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  verified_seller: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  active_seller: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  responsive_seller: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  quick_responder: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  trusted_seller: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  veteran_seller: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
}

const BADGE_COLORS = {
  new_seller:        'bg-sky-50     border-sky-200     text-sky-700',
  verified_seller:   'bg-indigo-50  border-indigo-200  text-indigo-700',
  active_seller:     'bg-violet-50  border-violet-200  text-violet-700',
  responsive_seller: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  quick_responder:   'bg-amber-50   border-amber-200   text-amber-700',
  trusted_seller:    'bg-orange-50  border-orange-200  text-orange-700',
  veteran_seller:    'bg-rose-50    border-rose-200    text-rose-700',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TrustBar({ score }) {
  const pct   = Math.min(Math.max(score ?? 0, 0), 100)
  const level = pct >= 80 ? { label: 'Top Seller',  color: 'from-amber-400 to-orange-500',  text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' }
    : pct >= 50           ? { label: 'Trusted',      color: 'from-emerald-400 to-teal-500',  text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' }
    : pct > 0             ? { label: 'Building',     color: 'from-sky-400 to-blue-500',       text: 'text-sky-700',   bg: 'bg-sky-50',    border: 'border-sky-200' }
    :                       { label: 'New Member',   color: 'from-gray-300 to-gray-400',      text: 'text-gray-500',  bg: 'bg-gray-50',   border: 'border-gray-200' }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${level.text} ${level.bg} ${level.border}`}>{level.label}</span>
        <span className="text-2xl font-black text-gray-900">{pct}</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${level.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 font-medium">
        <span>0</span><span>Trust Score</span><span>100</span>
      </div>
    </div>
  )
}

function TrustChecklist({ breakdown }) {
  const items = [
    { key: 'name',         label: 'Name added',            pts: 10 },
    { key: 'email',        label: 'Email verified',         pts: 10 },
    { key: 'phone',        label: 'Phone number added',     pts: 20 },
    { key: 'bio',          label: 'Bio/About completed',    pts: 15 },
    { key: 'location',     label: 'Location set',           pts: 10 },
    { key: 'profileImage', label: 'Profile photo uploaded', pts: 15 },
    { key: 'hasListings',  label: 'First listing posted',   pts: 10 },
    { key: 'accountAge',   label: 'Account 30+ days old',   pts: 10 },
  ]

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const done = breakdown?.[item.key]
        return (
          <div key={item.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                {done
                  ? <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                }
              </div>
              <span className={`text-xs font-medium ${done ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
            </div>
            <span className={`text-[10px] font-bold ${done ? 'text-emerald-600' : 'text-gray-300'}`}>+{item.pts}</span>
          </div>
        )
      })}
    </div>
  )
}

function BadgesCard({ badges }) {
  if (!badges?.length) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900">Badges Earned</h3>
        <p className="text-xs text-gray-400 mt-0.5">{badges.length} badge{badges.length !== 1 ? 's' : ''} unlocked</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.description}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold ${BADGE_COLORS[b.id] || 'bg-gray-50 border-gray-200 text-gray-600'}`}
          >
            {BADGE_ICONS[b.id] || null}
            {b.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function SellerStatsCard({ metrics }) {
  if (!metrics?.totalInquiries) return null

  const rate = metrics.responseRate ?? 0
  const rateColor = rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600'
  const rateBg    = rate >= 80 ? 'bg-emerald-50'    : rate >= 50 ? 'bg-amber-50'    : 'bg-rose-50'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">Seller Response Stats</h3>
        <p className="text-xs text-gray-400 mt-0.5">Based on {metrics.totalInquiries} buyer inquiry{metrics.totalInquiries !== 1 ? 's' : ''}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl p-3 ${rateBg}`}>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Response Rate</p>
          <p className={`text-2xl font-black ${rateColor}`}>{rate}%</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {metrics.respondedInquiries}/{metrics.totalInquiries} replied
          </p>
        </div>
        <div className="rounded-xl p-3 bg-gray-50">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Avg Response</p>
          <p className="text-2xl font-black text-gray-800">
            {formatResponseTime(metrics.avgResponseTimeMs)}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">average time</p>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()

  const [profile,       setProfile]       = useState(null)
  const [breakdown,     setBreakdown]     = useState(null)
  const [badges,        setBadges]        = useState([])
  const [sellerMetrics, setSellerMetrics] = useState(null)
  const [listings,      setListings]      = useState([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProfileAPI(), getMyListingsAPI()])
      .then(([profileRes, listingsRes]) => {
        if (cancelled) return
        setProfile(profileRes.user)
        setBreakdown(profileRes.trustBreakdown)
        setBadges(profileRes.user.badges || [])
        setSellerMetrics(profileRes.user.sellerMetrics || null)
        setListings(listingsRes.listings || [])
        updateUser(profileRes.user)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const data           = profile || user
  const activeListings = listings.filter((l) => l.status === 'active').length
  const soldListings   = listings.filter((l) => l.status === 'sold').length
  const totalViews     = listings.reduce((sum, l) => sum + (l.viewsCount || 0), 0)
  const avatarSrc      = data?.profileImage?.trim() || defaultAvatar

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="h-28 bg-gray-100" />
          <div className="p-6 space-y-3">
            <div className="h-6 w-1/3 bg-gray-100 rounded" />
            <div className="h-4 w-1/2 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Profile</h1>
        <p className="text-sm text-gray-400 mt-1">Your public marketplace identity</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%)' }} />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <img src={avatarSrc} alt={data?.name} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </div>
            </div>
            <Link to="/dashboard/settings" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 px-3.5 py-2 rounded-xl transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Profile
            </Link>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{data?.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.email}</p>
          {data?.bio && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{data.bio}</p>}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full capitalize">{data?.role}</span>
            {data?.location && <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">📍 {data.location}</span>}
            {data?.phone    && <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">📱 {data.phone}</span>}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-4 mt-4">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Joined {timeAgo(data?.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              {totalViews} views
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Listed', value: listings.length, accent: 'bg-indigo-50' },
          { label: 'Active Now',   value: activeListings,  accent: 'bg-emerald-50' },
          { label: 'Items Sold',   value: soldListings,    accent: 'bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className={`flex flex-col items-center justify-center py-4 rounded-2xl ${s.accent}`}>
            <span className="text-2xl font-black text-gray-900">{s.value}</span>
            <span className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Trust score card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Trust Score</h3>
          <p className="text-xs text-gray-400 mt-0.5">Complete your profile to earn buyer trust</p>
        </div>
        <TrustBar score={data?.trustScore ?? 0} />
        <div className="border-t border-gray-50 pt-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">How to improve</p>
          <TrustChecklist breakdown={breakdown} />
        </div>
        {breakdown && !breakdown.phone && (
          <Link to="/dashboard/settings" className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            Complete your profile to boost score →
          </Link>
        )}
      </div>

      {/* Badges */}
      <BadgesCard badges={badges} />

      {/* Seller response stats */}
      <SellerStatsCard metrics={sellerMetrics} />
    </div>
  )
}
