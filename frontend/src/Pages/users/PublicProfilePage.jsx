import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getPublicProfileAPI } from '../../api/user.api'
import { getUserReviewsAPI } from '../../api/review.api'
import useAuthStore from '../../store/auth.Store'
import defaultAvatar from '../../assets/images/default-avatar.jpg'
import { NO_IMAGE_PLACEHOLDER as defaultImage } from '../../constants/placeholderImage'
import KebabMenu from '../../components/ui/KebabMenu'
import ReportModal from '../../components/reports/ReportModal'
import { TrustHero, trustMessageFor, trustMessageTone } from '../../components/trust/SellerReputationCard'

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

// Role-neutral badge styling — shared ids between buyer and seller profiles,
// only the earned set differs. No decorative icons — color + label + hover
// title (tooltip) carry the meaning.
const BADGE_META = {
  verified_seller:   'bg-indigo-50 border-indigo-200 text-indigo-700',
  quick_responder:   'bg-amber-50 border-amber-200 text-amber-700',
  top_seller:        'bg-yellow-50 border-yellow-300 text-yellow-800',
  trusted_seller:    'bg-violet-50 border-violet-200 text-violet-700',
  new_seller:        'bg-sky-50 border-sky-200 text-sky-700',
  active_seller:     'bg-emerald-50 border-emerald-200 text-emerald-700',
  responsive_seller: 'bg-teal-50 border-teal-200 text-teal-700',
  veteran_seller:    'bg-rose-50 border-rose-200 text-rose-700',
}

// Color theory: green = safe/good, amber = caution, red = risk, blue/gray =
// neutral information. Completion rate is graded dynamically on the same scale.
function completionAccent(rate) {
  if (rate >= 90) return 'bg-emerald-50 border-emerald-100 text-emerald-700'
  if (rate >= 70) return 'bg-amber-50 border-amber-100 text-amber-700'
  return 'bg-rose-50 border-rose-100 text-rose-700'
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

function VerifiedCheck() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}

// Distinct, color-accented stat tiles — deliberately not identical white
// rectangles. No icon glyph; the title attribute explains the metric on hover.
function StatCard({ value, label, title, accent }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent}`} title={title}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="text-[11px] font-semibold opacity-70 mt-1.5 leading-tight">{label}</p>
    </div>
  )
}

function TrustCheckCard({ children }) {
  return (
    <div className="flex items-center gap-2.5 bg-white/80 border border-white rounded-xl px-3.5 py-3 shadow-sm">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className="text-sm font-semibold text-gray-700">{children}</span>
    </div>
  )
}

export default function PublicProfilePage() {
  const { userId } = useParams()
  const navigate   = useNavigate()
  const { isAuthenticated, user: currentUser } = useAuthStore()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [allReviews, setAllReviews]   = useState(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

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
  const isVerified = user.badges?.some((b) => b.id === 'verified_seller')
  const reviewsToShow = allReviews ?? recentReviews
  const trust = user.trust || { revealed: false, tier: 'New Member', tierStars: 1, reasons: [] }

  // "Why buyers trust this member" is generated server-side — no re-derivation here.
  const checklist = trust.reasons?.length ? trust.reasons : ['New to Xchange — no track record yet']

  const loadAllReviews = () => {
    if (allReviews) { setAllReviews(null); return }
    setReviewsLoading(true)
    getUserReviewsAPI(user._id)
      .then((d) => setAllReviews(d.reviews || []))
      .catch(() => {})
      .finally(() => setReviewsLoading(false))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

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

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

          {/* ═══ HERO — identity + trust score side by side, first thing seen ═══ */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-6 sm:px-8 py-7 text-white relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

            {isAuthenticated && currentUser?._id !== userId && (
              <div className="absolute top-3 right-3 z-10">
                <KebabMenu
                  buttonClassName="text-white/80 hover:text-white hover:bg-white/15"
                  items={[
                    { key: 'report', label: 'Report User', danger: true, onClick: () => setShowReportModal(true) },
                  ]}
                />
              </div>
            )}

            {showReportModal && (
              <ReportModal
                reportType="user"
                targetId={userId}
                targetLabel={user.name}
                onClose={() => setShowReportModal(false)}
              />
            )}

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative flex-shrink-0">
                <img
                  src={user.profileImage || defaultAvatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white/70 shadow-lg"
                />
                {user.ghostRisk?.flagged && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold">{user.name}</h1>
                  {isVerified && (
                    <span title="Identity verified by Xchange" className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                      <VerifiedCheck /> Verified
                    </span>
                  )}
                </div>
                {rs.reviewCount > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <StarRating rating={rs.averageRating} />
                    <span className="text-sm font-semibold text-white/90">{rs.averageRating}</span>
                  </div>
                )}
                {user.bio && (
                  <p className="text-sm text-white/80 leading-relaxed mt-2 max-w-md">{user.bio}</p>
                )}
                <p className="mt-2.5 text-[11px] text-white/75">
                  {user.location && <>{user.location} · </>}
                  Member since {memberSince(user.createdAt)}
                  {metrics.lastActiveAt && <> · Last active {timeAgo(metrics.lastActiveAt)}</>}
                </p>
              </div>

              {/* Premium Trust Badge card — public users see the badge only,
                  never a numeric score, pillars, or multiplier. */}
              <TrustHero trust={trust} size="lg" />
            </div>
          </div>

          <div className={`px-6 sm:px-8 pt-6 pb-8 space-y-7 ${user.ghostRisk?.flagged ? 'bg-amber-50/40' : ''}`}>

            {/* Ghost warning */}
            {user.ghostRisk?.flagged && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-800 font-medium">This user has a low response rate and may not reply promptly.</p>
              </div>
            )}

            {/* Dynamic trust message — depends on the actual public badge,
                not a single generic line shown regardless of standing. */}
            {(() => {
              const badgeLabel = trust.publicBadge?.label
              const tone = trustMessageTone(badgeLabel)
              const isWarning = tone.icon === 'warning'
              return (
                <div className={`flex items-start gap-3 ${tone.bg} border ${tone.border} rounded-xl p-3.5`}>
                  <svg className={`w-4 h-4 ${tone.text} flex-shrink-0 mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {isWarning
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    }
                  </svg>
                  <div className="space-y-2">
                    <p className={`text-xs ${tone.text} leading-relaxed`}>{trustMessageFor(badgeLabel)}</p>
                    {badgeLabel === 'Buy Carefully' && typeof trust.violationCount === 'number' && (
                      <div className="flex items-center justify-between text-xs font-semibold bg-white/60 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        <span className={tone.text}>Confirmed Policy Violations</span>
                        <span className={tone.text}>{trust.violationCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ═══ Reputation Summary — kept concise & public (Phase 12D.1) ═══ */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Reputation</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard title="Average rating across all completed transactions" value={rs.reviewCount > 0 ? rs.averageRating : '—'} label="Average Rating" accent="bg-amber-50 border-amber-100 text-amber-700" />
                <StatCard title="Transactions completed successfully" value={rs.completedDeals ?? 0} label="Successful Deals" accent="bg-emerald-50 border-emerald-100 text-emerald-700" />
                <StatCard title="Listings currently live on the marketplace" value={user.activeListingCount ?? 0} label="Active Listings" accent="bg-blue-50 border-blue-100 text-blue-700" />
                <StatCard title="Year this member joined Xchange" value={memberSince(user.createdAt)} label="Member Since" accent="bg-slate-50 border-slate-200 text-slate-700" />
              </div>
            </div>

            {/* ═══ Badges ═══ */}
            {user.badges?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Badges</p>
                <div className="flex flex-wrap gap-2">
                  {user.badges.map((b) => (
                    <span
                      key={b.id}
                      title={b.description}
                      className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full border cursor-default ${BADGE_META[b.id] || 'bg-gray-50 border-gray-200 text-gray-600'}`}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ Trust summary — premium, not an alert box ═══ */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/50 p-5">
              <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-3">Why buyers trust this member</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {checklist.map((item) => <TrustCheckCard key={item}>{item}</TrustCheckCard>)}
              </div>
            </div>

            {/* ═══ Reviews — real testimonials ═══ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {allReviews ? 'All Reviews' : 'Latest Reviews'}
                </p>
                {rs.reviewCount > (recentReviews.length || 0) && (
                  <button
                    onClick={loadAllReviews}
                    disabled={reviewsLoading}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
                  >
                    {reviewsLoading ? 'Loading…' : allReviews ? 'Show Less' : `View All (${rs.reviewCount})`}
                  </button>
                )}
              </div>

              {reviewsToShow.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 font-medium">No reviews yet</p>
                  <p className="text-xs text-gray-400 mt-1">Reviews unlock after completed transactions</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reviewsToShow.map((review) => (
                    <div key={review._id} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {review.reviewer?._id ? (
                          <Link to={`/users/${review.reviewer._id}`} className="flex items-center gap-3 min-w-0 flex-1 group" title="View reviewer's profile">
                            <img
                              src={review.reviewer?.profileImage || defaultAvatar}
                              alt={review.reviewer?.name}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-200"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate group-hover:underline">{review.reviewer?.name}</p>
                              <StarRating rating={review.rating} />
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img src={defaultAvatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">Anonymous</p>
                              <StarRating rating={review.rating} />
                            </div>
                          </div>
                        )}
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(review.createdAt)}</span>
                      </div>
                      {review.listing?.title && (
                        <p className="text-[10px] text-indigo-500 font-medium mb-1">{review.listing.title}</p>
                      )}
                      {review.comment && (
                        <p className="text-sm text-gray-600 leading-relaxed italic">"{review.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
