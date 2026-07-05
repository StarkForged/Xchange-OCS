import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getPublicProfileAPI } from '../../api/user.api'
import defaultAvatar from '../../assets/images/default-avatar.jpg'
import { NO_IMAGE_PLACEHOLDER as defaultImage } from '../../constants/placeholderImage'

const formatPrice = (p) => p?.amount != null ? `₹${p.amount.toLocaleString('en-IN')}` : '—'

const timeAgo = (d) => {
  if (!d) return ''
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

const memberSince = (d) => {
  if (!d) return 'Unknown'
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const formatResponseTime = (ms) => {
  if (!ms) return null
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `~${mins}m`
  const hrs = Math.round(ms / 3600000)
  if (hrs < 24) return `~${hrs}h`
  return `~${Math.round(hrs / 24)}d`
}

function StarRating({ rating, size = 'sm' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sz} flex-shrink-0 ${star <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function TrustTierBadge({ score }) {
  const tier =
    score >= 90 ? { label: 'Top Seller',  bg: 'from-yellow-400 to-amber-500',  text: 'text-amber-900' }
    : score >= 80 ? { label: 'Trusted',   bg: 'from-amber-400 to-orange-500',  text: 'text-orange-900' }
    : score >= 50 ? { label: 'Building',  bg: 'from-emerald-400 to-teal-500',  text: 'text-teal-900'  }
    : score > 0   ? { label: 'New',       bg: 'from-sky-400 to-blue-500',      text: 'text-blue-900'  }
    :               { label: 'New Member', bg: 'from-gray-300 to-gray-400',    text: 'text-gray-800'  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${tier.bg} text-white shadow-sm`}>
      {tier.label}
    </span>
  )
}

export default function PublicProfilePage() {
  const { userId } = useParams()
  const navigate   = useNavigate()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getPublicProfileAPI(userId)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.message || 'User not found') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-700 font-semibold mb-3">{error || 'User not found'}</p>
          <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  const { user, activeListings = [], recentReviews = [] } = data
  const metrics = user.sellerMetrics || {}
  const rs      = user.reviewStats   || {}
  const respTime = formatResponseTime(metrics.avgResponseTimeMs)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* ── Profile Header ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative flex-shrink-0">
              <img
                src={user.profileImage || defaultAvatar}
                alt={user.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-100 shadow-sm"
              />
              {user.ghostRisk?.flagged && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
                <TrustTierBadge score={user.trustScore} />
              </div>
              {user.bio && (
                <p className="text-sm text-gray-600 leading-relaxed mb-2">{user.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {user.location && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {user.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Member since {memberSince(user.createdAt)}
                </span>
              </div>
            </div>

            {/* Trust score pill */}
            <div className="flex-shrink-0 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex flex-col items-center justify-center shadow-md">
                <span className="text-2xl font-black text-white leading-none">{user.trustScore}</span>
                <span className="text-[10px] text-white/70 font-semibold mt-0.5">Trust</span>
              </div>
            </div>
          </div>

          {/* Ghost warning */}
          {user.ghostRisk?.flagged && (
            <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-800 font-medium">This seller has a low response rate and may not reply promptly.</p>
            </div>
          )}
        </div>

        {/* ── Reputation Section ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full flex-shrink-0" />
            Reputation
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

            {/* Avg Rating */}
            <div className="col-span-2 sm:col-span-1 bg-indigo-50 rounded-xl p-4 text-center">
              {rs.reviewCount > 0 ? (
                <>
                  <div className="text-3xl font-black text-indigo-700 leading-none">{rs.averageRating}</div>
                  <StarRating rating={rs.averageRating} size="sm" />
                  <p className="text-[10px] text-gray-400 mt-1">{rs.reviewCount} review{rs.reviewCount !== 1 ? 's' : ''}</p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-black text-gray-300 leading-none">—</div>
                  <p className="text-[10px] text-gray-400 mt-2">No reviews</p>
                </>
              )}
            </div>

            {/* Completed Deals */}
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-emerald-700 leading-none">{rs.completedDeals ?? 0}</div>
              <p className="text-[10px] text-gray-400 mt-1">Completed</p>
              <p className="text-[10px] text-gray-400">Deals</p>
            </div>

            {/* Completion Rate — only meaningful once there's a transaction history */}
            {(rs.completedDeals > 0 || rs.responsibleCancellations > 0) && (
              <div className={`rounded-xl p-4 text-center ${
                (rs.completionRate ?? 100) >= 90 ? 'bg-emerald-50' :
                (rs.completionRate ?? 100) >= 70 ? 'bg-amber-50'   : 'bg-rose-50'
              }`}>
                <div className={`text-3xl font-black leading-none ${
                  (rs.completionRate ?? 100) >= 90 ? 'text-emerald-700' :
                  (rs.completionRate ?? 100) >= 70 ? 'text-amber-700'   : 'text-rose-700'
                }`}>{rs.completionRate ?? 100}%</div>
                <p className="text-[10px] text-gray-400 mt-1">Completion</p>
                <p className="text-[10px] text-gray-400">Rate</p>
              </div>
            )}

            {/* Seller-caused cancellations — only shown when > 0 */}
            {(rs.sellerCancelledDeals ?? 0) > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center" title="Deals cancelled by this seller">
                <div className="text-3xl font-black text-gray-500 leading-none">{rs.sellerCancelledDeals}</div>
                <p className="text-[10px] text-gray-400 mt-1">Cancelled</p>
                <p className="text-[10px] text-gray-400">as Seller</p>
              </div>
            )}

            {/* Buyer-caused cancellations — only shown when > 0 */}
            {(rs.buyerCancelledDeals ?? 0) > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center" title="Deals cancelled by this user as a buyer">
                <div className="text-3xl font-black text-gray-500 leading-none">{rs.buyerCancelledDeals}</div>
                <p className="text-[10px] text-gray-400 mt-1">Cancelled</p>
                <p className="text-[10px] text-gray-400">as Buyer</p>
              </div>
            )}

            {/* Response Rate */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              {metrics.totalInquiries ? (
                <>
                  <div className={`text-3xl font-black leading-none ${
                    metrics.responseRate >= 80 ? 'text-emerald-600'
                    : metrics.responseRate >= 50 ? 'text-amber-600'
                    : 'text-rose-600'
                  }`}>{metrics.responseRate}%</div>
                  <p className="text-[10px] text-gray-400 mt-1">Response</p>
                  <p className="text-[10px] text-gray-400">Rate</p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-black text-gray-300 leading-none">—</div>
                  <p className="text-[10px] text-gray-400 mt-2">Response</p>
                </>
              )}
            </div>

            {/* Avg Response Time */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              {respTime ? (
                <>
                  <div className="text-2xl font-black text-sky-600 leading-none">{respTime}</div>
                  <p className="text-[10px] text-gray-400 mt-1">Avg Reply</p>
                  <p className="text-[10px] text-gray-400">Time</p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-black text-gray-300 leading-none">—</div>
                  <p className="text-[10px] text-gray-400 mt-2">Reply Time</p>
                </>
              )}
            </div>

            {/* Listings */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-gray-800 leading-none">{user.listingCount}</div>
              <p className="text-[10px] text-gray-400 mt-1">Listings</p>
              <p className="text-[10px] text-gray-400">Posted</p>
            </div>

            {/* Active listings */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-gray-800 leading-none">{user.activeListingCount ?? 0}</div>
              <p className="text-[10px] text-gray-400 mt-1">Active</p>
              <p className="text-[10px] text-gray-400">Listings</p>
            </div>
          </div>

          {/* Badges */}
          {user.badges?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {user.badges.map((b) => (
                <span
                  key={b.id}
                  title={b.description}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600"
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Reviews Section ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-400 rounded-full flex-shrink-0" />
            Recent Reviews
          </h2>

          {recentReviews.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">⭐</div>
              <p className="text-sm text-gray-500 font-medium">No reviews yet</p>
              <p className="text-xs text-gray-400 mt-1">Reviews unlock after completed transactions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <div key={review._id} className="flex gap-3">
                  <img
                    src={review.reviewer?.profileImage || defaultAvatar}
                    alt={review.reviewer?.name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">{review.reviewer?.name}</span>
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(review.createdAt)}</span>
                    </div>
                    {review.listing?.title && (
                      <p className="text-[10px] text-indigo-500 font-medium mb-1">{review.listing.title}</p>
                    )}
                    {review.comment && (
                      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Active Listings Section ── */}
        {activeListings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full flex-shrink-0" />
              Active Listings
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeListings.map((listing) => (
                <Link
                  key={listing._id}
                  to={`/listings/${listing._id}`}
                  className="group bg-gray-50 hover:bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-sm rounded-xl overflow-hidden transition-all duration-200"
                >
                  <div className="aspect-[4/3] bg-gray-200 overflow-hidden">
                    <img
                      src={listing.images?.[0] || defaultImage}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1 leading-snug">{listing.title}</p>
                    <p className="text-sm font-bold text-indigo-600">{formatPrice(listing.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
