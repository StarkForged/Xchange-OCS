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

function TrustBar({ score }) {
  const pct = Math.min(Math.max(score ?? 0, 0), 100)
  const level = pct >= 80 ? { label: 'Top Seller',     color: 'from-amber-400 to-orange-500',  text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' }
    : pct >= 50 ? { label: 'Trusted',       color: 'from-emerald-400 to-teal-500',   text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' }
    : pct > 0  ?  { label: 'Building',      color: 'from-sky-400 to-blue-500',        text: 'text-sky-700',    bg: 'bg-sky-50',     border: 'border-sky-200' }
    :             { label: 'New Member',     color: 'from-gray-300 to-gray-400',       text: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-gray-200' }

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
    { key: 'name',         label: 'Name added',              pts: 10 },
    { key: 'email',        label: 'Email verified',           pts: 10 },
    { key: 'phone',        label: 'Phone number added',       pts: 20 },
    { key: 'bio',          label: 'Bio/About completed',      pts: 15 },
    { key: 'location',     label: 'Location set',             pts: 10 },
    { key: 'profileImage', label: 'Profile photo uploaded',   pts: 15 },
    { key: 'hasListings',  label: 'First listing posted',     pts: 10 },
    { key: 'accountAge',   label: 'Account 30+ days old',     pts: 10 },
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

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [profile, setProfile]         = useState(null)
  const [breakdown, setBreakdown]     = useState(null)
  const [listings, setListings]       = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProfileAPI(), getMyListingsAPI()])
      .then(([profileRes, listingsRes]) => {
        if (cancelled) return
        setProfile(profileRes.user)
        setBreakdown(profileRes.trustBreakdown)
        setListings(listingsRes.listings || [])
        // Sync fresh data back to auth store
        updateUser(profileRes.user)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const data = profile || user  // fall back to store while loading
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
            {data?.phone && <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">📱 {data.phone}</span>}
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
    </div>
  )
}
