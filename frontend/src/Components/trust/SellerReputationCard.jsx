import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPublicProfileAPI } from '../../api/user.api'
import defaultAvatar from '../../assets/images/default-avatar.jpg'

// Role-neutral badge styling — ids are shared between buyer and seller
// profiles (see backend/src/Utils/sellerMetrics.js), only the earned set differs.
// No decorative icons — the color + label + hover title carry the meaning.
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

// Public Trust Badge styling, keyed by the colorKey the backend's
// trustEngine already computed (see publicBadgeFor in trustEngine.js) — this
// is presentation only. The badge (not a number) is the only trust-derived
// thing a non-owner ever sees (Phase 12D.1).
const BADGE_COLOR_STYLES = {
  gold:   { ring: 'from-yellow-400 to-amber-500',  chip: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
  green:  { ring: 'from-emerald-400 to-teal-500',  chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  blue:   { ring: 'from-sky-400 to-blue-500',      chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  yellow: { ring: 'from-amber-400 to-orange-400',  chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  orange: { ring: 'from-orange-400 to-orange-600', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  red:    { ring: 'from-rose-500 to-rose-700',     chip: 'bg-rose-50 text-rose-700 border-rose-200' },
}
function badgeStyle(colorKey) {
  return BADGE_COLOR_STYLES[colorKey] || BADGE_COLOR_STYLES.yellow
}

// Subtitle under the tier name on the premium Trust Badge card — purely
// presentational copy, keyed by the same tier label trustEngine computes.
const TIER_SUBTITLE = {
  'Elite Trusted':      'Exceptional Reputation',
  'Trusted Member':     'Verified Reputation',
  'Established Member': 'Growing Reputation',
  'Building Trust':     'Verified Member',
  'Buy Carefully':      'Moderated Account',
  'Restricted':         'High Risk Account',
}

// Dynamic trust message per public badge (Final Trust UI Polish) — the
// message must match what buyers are actually being told, not a single
// generic line shown regardless of standing.
const TRUST_MESSAGES = {
  'Elite Trusted':      'This member has built an excellent reputation through verified identity, successful exchanges, genuine reviews, and responsible marketplace behaviour.',
  'Trusted Member':     'This member has consistently demonstrated reliable marketplace behaviour through successful exchanges, positive reviews, and responsible participation.',
  'Established Member': 'This member has established a positive reputation on Xchange and continues to build trust through genuine marketplace activity.',
  'Building Trust':     'This member has completed account verification and is actively building their reputation within the Xchange community.',
  'Buy Carefully':      'This member has received one or more confirmed moderation actions that reduced their marketplace reputation. Review listings carefully, communicate through Xchange, and inspect items before completing an exchange.',
  'Restricted':         'This account has received multiple confirmed policy violations and has significantly reduced marketplace trust. Exercise extreme caution.',
}

// Message banner tone — positive tiers read as reassurance, cautionary
// tiers read as a warning. Never implies WHY (no reasons/history exposed).
const MESSAGE_TONE = {
  'Elite Trusted':      { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'info' },
  'Trusted Member':     { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'info' },
  'Established Member': { bg: 'bg-sky-50',     border: 'border-sky-200',    text: 'text-sky-700',     icon: 'info' },
  'Building Trust':     { bg: 'bg-sky-50',     border: 'border-sky-200',    text: 'text-sky-700',     icon: 'info' },
  'Buy Carefully':      { bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',   icon: 'warning' },
  'Restricted':         { bg: 'bg-rose-50',    border: 'border-rose-200',   text: 'text-rose-700',    icon: 'warning' },
}

function InfoIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function WarningIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function ShieldIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-3.4 8.32-7.8 8.93a1.5 1.5 0 01-.4 0C8.4 20.32 5 16.556 5 12V6.741a1.5 1.5 0 011.05-1.43l5.5-1.75a1.5 1.5 0 01.9 0l5.5 1.75A1.5 1.5 0 0121 6.741V12z" />
    </svg>
  )
}

// The dynamic "why buyers should feel X" message for a given public badge —
// exported so PublicProfilePage (which renders its own hero) stays in sync
// with the exact same copy instead of duplicating it.
export function trustMessageFor(badgeLabel) {
  return TRUST_MESSAGES[badgeLabel] || TRUST_MESSAGES['Building Trust']
}
export function trustMessageTone(badgeLabel) {
  return MESSAGE_TONE[badgeLabel] || MESSAGE_TONE['Building Trust']
}

// Color theory: green = safe/good, amber = caution, red = risk, blue/gray =
// neutral information. Completion rate is graded dynamically on the same scale.
function completionAccent(rate) {
  if (rate >= 90) return 'bg-emerald-50 border-emerald-100 text-emerald-700'
  if (rate >= 70) return 'bg-amber-50 border-amber-100 text-amber-700'
  return 'bg-rose-50 border-rose-100 text-rose-700'
}

function timeAgo(d) {
  if (!d) return null
  const days = Math.floor((Date.now() - new Date(d)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function memberDuration(date) {
  if (!date) return null
  const months = Math.floor((Date.now() - new Date(date)) / (30 * 86_400_000))
  if (months < 1)  return null
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`
  const y = Math.floor(months / 12)
  return `${y} year${y === 1 ? '' : 's'}`
}

function memberSince(d) {
  if (!d) return 'Unknown'
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function Stars({ rating, size = 'w-3.5 h-3.5' }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${size} flex-shrink-0 ${star <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`}
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
// rectangles, so the eye can tell them apart at a glance. No icon glyph;
// the title attribute explains the metric on hover.
function StatCard({ value, label, title, accent }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${accent}`} title={title}>
      <p className="text-xl font-black leading-none">{value}</p>
      <p className="text-[10px] font-semibold opacity-70 mt-1.5 leading-tight">{label}</p>
    </div>
  )
}

function TrustCheckCard({ children }) {
  return (
    <div className="flex items-center gap-2.5 bg-white/80 border border-white rounded-xl px-3 py-2.5 shadow-sm">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className="text-xs font-semibold text-gray-700">{children}</span>
    </div>
  )
}

// Premium Trust Badge — an identity-card, not a floating emoji (Final Trust
// UI Polish). Badge-ONLY: public users never see a numeric score, five
// pillars, or multiplier under any circumstance — this renders exactly what
// the getPublicProfile API sends (emoji + label), just presented properly.
export function TrustHero({ trust, size = 'md' }) {
  const badge = trust?.publicBadge || { emoji: '🟡', label: 'Building Trust', colorKey: 'yellow' }
  const style = badgeStyle(badge.colorKey)
  const subtitle = TIER_SUBTITLE[badge.label] || ''
  const big = size === 'lg'

  return (
    <div
      className={`relative flex-shrink-0 flex flex-col items-center text-center overflow-hidden rounded-2xl bg-gradient-to-br ${style.ring} shadow-lg ${
        big ? 'w-44 px-5 py-5' : 'w-36 px-4 py-4'
      }`}
      title={badge.label}
    >
      {/* Faint shield watermark — the "identity card" cue behind the badge icon */}
      <ShieldIcon className={`absolute text-white/10 pointer-events-none ${big ? '-right-3 -top-3 w-24 h-24' : '-right-2 -top-2 w-20 h-20'}`} />

      <div className={`relative rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center ${big ? 'w-14 h-14 mb-2.5' : 'w-11 h-11 mb-2'}`}>
        <span className={big ? 'text-2xl' : 'text-xl'}>{badge.emoji}</span>
      </div>
      <p className={`relative font-black text-white leading-tight ${big ? 'text-base' : 'text-sm'}`}>{badge.label}</p>
      {subtitle && (
        <p className={`relative text-white/80 font-semibold mt-1 ${big ? 'text-[11px]' : 'text-[10px]'}`}>{subtitle}</p>
      )}
    </div>
  )
}

// Public trust card — identical for buyer and seller profiles. Only the data
// (earned badges, stats) differs; there is no separate "buyer" layout.
export default function SellerReputationCard({ seller }) {
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seller?._id) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    getPublicProfileAPI(seller._id)
      .then((d) => {
        if (cancelled) return
        setProfile(d.user)
        setReviews((d.recentReviews || []).slice(0, 3))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [seller?._id])

  if (!seller || typeof seller !== 'object') return null

  // Prefer the freshly fetched public profile (has reviewStats/listing counts);
  // fall back to the listing's populated seller field so the card still paints
  // something useful before the fetch resolves.
  const p = profile || seller
  const rs = p.reviewStats || {}
  const trust = p.trust || { revealed: false, tier: 'New Member', tierStars: 1, reasons: [] }
  const badges = p.badges ?? []
  const isVerified = badges.some((b) => b.id === 'verified_seller')
  const isGhost = p.ghostRisk?.flagged
  const lastActive = timeAgo(p.sellerMetrics?.lastActiveAt)

  // "Why buyers trust this member" is generated server-side (trustEngine's
  // buildTrustReasons) — no client-side re-derivation of trust logic.
  const checklist = trust.reasons?.length ? trust.reasons : ['New to Xchange — no track record yet']

  return (
    <div className={`rounded-3xl border shadow-sm overflow-hidden ${isGhost ? 'border-amber-200' : 'border-gray-100'}`}>

      {/* ═══ HERO — identity + trust badge side by side, first thing seen ═══ */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-5 sm:px-6 py-6 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex items-center gap-4 flex-wrap">
          <Link to={`/users/${seller._id}`} className="flex-shrink-0" title="View full profile">
            <img
              src={p.profileImage || defaultAvatar}
              alt={p.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/70 shadow-lg hover:opacity-90 transition-opacity"
            />
          </Link>
          <div className="min-w-0 flex-1 basis-40">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/users/${seller._id}`} className="text-base font-bold truncate hover:underline" title="View full profile">
                {p.name || 'Unknown user'}
              </Link>
              {isVerified && (
                <span title="Identity verified by Xchange" className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                  <VerifiedCheck /> Verified
                </span>
              )}
            </div>
            {rs.reviewCount > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <Stars rating={rs.averageRating} />
                <span className="text-xs font-semibold text-white/90">{rs.averageRating}</span>
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-white/75">
              Member since {memberSince(p.createdAt)}
              {lastActive && <> · Active {lastActive}</>}
            </p>
          </div>

          <TrustHero trust={trust} />
        </div>
      </div>

      <div className={`px-5 sm:px-6 pt-5 pb-6 space-y-6 ${isGhost ? 'bg-amber-50/40' : 'bg-white'}`}>

        {/* Dynamic trust message — depends on the actual public badge, so a
            "Buy Carefully" seller never gets the same reassuring copy as an
            Elite Trusted one. */}
        {(() => {
          const tone = trustMessageTone(trust.publicBadge?.label)
          const Icon = tone.icon === 'warning' ? WarningIcon : InfoIcon
          return (
            <div className={`flex items-start gap-2.5 ${tone.bg} border ${tone.border} rounded-xl p-3.5`}>
              <Icon className={`w-4 h-4 ${tone.text} flex-shrink-0 mt-0.5`} />
              <div className="space-y-2">
                <p className={`text-xs ${tone.text} leading-relaxed`}>
                  {trustMessageFor(trust.publicBadge?.label)}
                </p>
                {trust.publicBadge?.label === 'Buy Carefully' && typeof trust.violationCount === 'number' && (
                  <div className="flex items-center justify-between text-xs font-semibold bg-white/60 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    <span className={tone.text}>Confirmed Policy Violations</span>
                    <span className={tone.text}>{trust.violationCount}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {isGhost && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-amber-700 leading-relaxed">
              Low response history detected. Message them and wait for a reply before making any commitments.
            </p>
          </div>
        )}

        {/* ═══ Reputation Summary — kept concise & public (Phase 12D.1) ═══ */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Reputation</p>
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard title="Average rating across all completed transactions" value={rs.reviewCount > 0 ? rs.averageRating : '—'} label="Avg Rating" accent="bg-amber-50 border-amber-100 text-amber-700" />
            <StatCard title="Transactions completed successfully" value={rs.completedDeals ?? 0} label="Successful Deals" accent="bg-emerald-50 border-emerald-100 text-emerald-700" />
            <StatCard title="Listings currently live on the marketplace" value={p.activeListingCount ?? 0} label="Active Listings" accent="bg-blue-50 border-blue-100 text-blue-700" />
            <StatCard title="Year this member joined Xchange" value={memberSince(p.createdAt)} label="Member Since" accent="bg-slate-50 border-slate-200 text-slate-700" />
          </div>
        </div>

        {/* ═══ Badges ═══ */}
        {badges.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Badges</p>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
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
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/50 p-4">
          <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-3">Why buyers trust this member</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklist.map((item) => <TrustCheckCard key={item}>{item}</TrustCheckCard>)}
          </div>
        </div>

        {/* ═══ Latest reviews — real testimonials ═══ */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Latest Reviews</p>
            <Link to={`/users/${seller._id}`} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              View Full Profile →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reviews.map((review) => (
                <div key={review._id} className="bg-white border border-gray-100 shadow-sm rounded-xl p-3.5">
                  <div className="flex items-center gap-2.5 mb-2">
                    {review.reviewer?._id ? (
                      <Link to={`/users/${review.reviewer._id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group" title="View reviewer's profile">
                        <img
                          src={review.reviewer?.profileImage || defaultAvatar}
                          alt={review.reviewer?.name}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate group-hover:underline">{review.reviewer?.name || 'Anonymous'}</p>
                          <Stars rating={review.rating} />
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img src={defaultAvatar} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">Anonymous</p>
                          <Stars rating={review.rating} />
                        </div>
                      </div>
                    )}
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(review.createdAt)}</span>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-gray-600 leading-relaxed italic line-clamp-2">"{review.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
