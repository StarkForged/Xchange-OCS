/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Xchange Trust Framework v2  (Phase 12D)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SINGLE SOURCE OF TRUTH for trust calculation, badges, progressive display,
 * and trust history across the whole app (public profile, seller cards,
 * dashboard, listing seller info, admin user details).
 *
 * Trust = Identity + Transactions + Reviews + Marketplace Activity + Moderation
 *         (each pillar 0–20, total 0–100 "raw" score)
 *
 * The raw score is then passed through the Trust Penalty Multiplier (only
 * relevant once a critical moderation has been confirmed) to produce the
 * *displayed* score persisted to `user.trustScore`.
 *
 * Call `recalculateTrust(userId, { trigger, meta })` at every event that
 * should move the needle — see the bottom of this file for the full trigger
 * list. Recalculation is event-driven, not polled: nothing here runs on a
 * schedule.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const User    = require('../Models/User')
const Listing = require('../Models/Listing')
const Message = require('../Models/Message')

const { computeResponseMetrics, computeGhostRisk } = require('../Utils/sellerMetrics')
const { computeProfileCompletion } = require('../Utils/profileCompletion')
const { isTransactionEligibleForTrust } = require('../Utils/collusionGuard')
const { getTrustEligibleReviews, computeReviewsPillar } = require('../Utils/reviewTrust')
const { SEVERITY, SEVERITY_META } = require('../Utils/moderationSeverity')

const DAY_MS   = 86_400_000
const MONTH_MS = 30 * DAY_MS

// ── Trust tiers (public-facing, badge-first) ─────────────────────────────────

const TIERS = [
  { min: 80, label: 'Elite Trusted',       stars: 5, chip: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
  { min: 60, label: 'Highly Trusted',      stars: 4, chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { min: 40, label: 'Established Member',  stars: 3, chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  { min: 20, label: 'Building Trust',      stars: 2, chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  { min:  0, label: 'New Member',          stars: 1, chip: 'bg-gray-100 text-gray-600 border-gray-200' },
]

function tierFor(displayedScore) {
  return TIERS.find((t) => displayedScore >= t.min) || TIERS[TIERS.length - 1]
}

// ── Public Trust Badge (Phase 12D.1) ─────────────────────────────────────────
// The ONLY trust-derived thing a non-owner/non-admin ever sees. Deliberately
// a label, not a number — and moderation risk takes priority over the
// ordinary tier ladder, since "this seller has an active penalty" is more
// useful to a buyer than "Building Trust".
const PUBLIC_BADGE_MAP = {
  'Elite Trusted':      { emoji: '⭐', label: 'Elite Trusted',      colorKey: 'gold' },
  'Highly Trusted':     { emoji: '🟢', label: 'Trusted Member',     colorKey: 'green' },
  'Established Member': { emoji: '🔵', label: 'Established Member', colorKey: 'blue' },
  'Building Trust':     { emoji: '🟡', label: 'Building Trust',     colorKey: 'yellow' },
  'New Member':         { emoji: '🟡', label: 'Building Trust',     colorKey: 'yellow' },
}

function publicBadgeFor({ tier, moderationClean, hasCritical }) {
  if (hasCritical) return { emoji: '🔴', label: 'Restricted', colorKey: 'red' }
  if (!moderationClean) return { emoji: '🟠', label: 'Buy Carefully', colorKey: 'orange' }
  return PUBLIC_BADGE_MAP[tier] || PUBLIC_BADGE_MAP['New Member']
}

// ── Pillar 1 — Identity & Verification (20) ──────────────────────────────────

function identityPillar(user, profileCompletionPct) {
  const emailVerified   = !!user.emailVerified
  const phoneVerified   = !!user.phoneVerified
  const profileComplete = profileCompletionPct >= 100
  const adminVerified   = !!user.isVerifiedSeller // only admin-approved sellers get these 2 points

  const score =
    (emailVerified   ? 6 : 0) +
    (phoneVerified   ? 6 : 0) +
    (profileComplete ? 6 : 0) +
    (adminVerified   ? 2 : 0)

  return { score: Math.min(20, score), emailVerified, phoneVerified, profileComplete, adminVerified }
}

// ── Pillar 2 — Transaction History (20, diminishing returns) ────────────────

async function countEligibleCompletedDeals(userId) {
  const [asSeller, asBuyer] = await Promise.all([
    Listing.find({ seller: userId, 'transaction.completedAt': { $ne: null } })
      .select('transaction').lean(),
    Listing.find({ 'transaction.buyer': userId, 'transaction.completedAt': { $ne: null } })
      .select('transaction').lean(),
  ])
  return [...asSeller, ...asBuyer].filter(isTransactionEligibleForTrust).length
}

function transactionPillar(eligibleDealCount) {
  const n = eligibleDealCount
  let score = 0
  if (n >= 1) score += 5                                   // 1st deal
  score += Math.min(Math.max(n - 1, 0), 2) * 3              // 2nd–3rd
  score += Math.min(Math.max(n - 3, 0), 3) * 2              // 4th–6th
  score += Math.min(Math.max(n - 6, 0), 4) * 1              // 7th–10th
  // deals beyond the 10th intentionally add nothing
  return { score: Math.min(20, score), eligibleDealCount: n }
}

// ── Pillar 4 — Marketplace Activity (20) ─────────────────────────────────────

function currentQuarterKey(date = new Date()) {
  const q = Math.floor(date.getMonth() / 3) + 1
  return `${date.getFullYear()}-Q${q}`
}

function quarterStartDate(date = new Date()) {
  const q = Math.floor(date.getMonth() / 3)
  return new Date(date.getFullYear(), q * 3, 1)
}

async function wasActiveThisQuarter(userId) {
  const since = quarterStartDate()
  const [msg, listing] = await Promise.all([
    Message.exists({ sender: userId, createdAt: { $gte: since } }),
    Listing.exists({ seller: userId, createdAt: { $gte: since } }),
  ])
  return !!(msg || listing)
}

// Weighted internally from response rate + speed — the formula itself is
// deliberately not exposed to the UI, only the resulting 0–6 pillar slice.
function responseBehaviourScore(metrics) {
  if (!metrics || metrics.totalInquiries === 0) return 3 // no data yet — neutral, not punished
  const rateComponent  = (metrics.responseRate / 100) * 4 // up to 4
  const speedComponent = metrics.avgResponseTimeMs != null
    ? Math.max(0, Math.min(2, 2 - (metrics.avgResponseTimeMs / (2 * 3_600_000)) * 2))
    : 0
  return Math.min(6, Math.round((rateComponent + speedComponent) * 10) / 10)
}

// Healthy = approved, complete, not moderated — never a raw listing count.
async function healthyListingsScore(userId) {
  const healthyCount = await Listing.countDocuments({
    seller:   userId,
    isHidden: { $ne: true },
    status:   { $ne: 'removed' },
    images:   { $exists: true, $not: { $size: 0 } },
  })
  return Math.min(4, Math.floor(healthyCount / 3))
}

async function activityPillar(user, metrics) {
  const quarterKey = currentQuarterKey()
  const activeQuarters = new Set(user.activeQuarters || [])

  if (!activeQuarters.has(quarterKey) && await wasActiveThisQuarter(user._id)) {
    activeQuarters.add(quarterKey)
  }

  const tenureScore   = Math.min(10, activeQuarters.size * 2)
  const responseScore = responseBehaviourScore(metrics)
  const healthyScore  = await healthyListingsScore(user._id)

  return {
    score: Math.min(20, tenureScore + responseScore + healthyScore),
    activeQuarters: [...activeQuarters],
    tenureScore,
    responseScore,
    healthyScore,
  }
}

// ── Pillar 5 — Moderation & Safety (20, starts full, only confirmed hits) ──

function moderationPillar(user) {
  const now = Date.now()
  let deduction = 0
  let hasCritical = false

  for (const m of (user.moderationRecord || [])) {
    if (!m.confirmedAt) continue
    const monthsSince = (now - new Date(m.confirmedAt).getTime()) / MONTH_MS

    if (m.severity === SEVERITY.CRITICAL) {
      hasCritical = true
      deduction += SEVERITY_META.critical.penalty // never recovers
    } else if (m.severity === SEVERITY.MEDIUM) {
      const recovered = monthsSince >= SEVERITY_META.medium.recoveryMonths
      deduction += recovered ? SEVERITY_META.medium.penalty / 2 : SEVERITY_META.medium.penalty
    } else if (m.severity === SEVERITY.MINOR) {
      const recovered = monthsSince >= SEVERITY_META.minor.recoveryMonths
      deduction += recovered ? 0 : SEVERITY_META.minor.penalty
    }
  }

  return { score: Math.max(0, 20 - deduction), hasCritical }
}

// ── Trust Penalty Multiplier ──────────────────────────────────────────────────
// Replaces automatic suspension-on-first-fraud. A confirmed critical
// moderation zeroes the moderation pillar AND applies a 0.5x multiplier to
// the whole displayed score. The multiplier can climb back (0.5 → 0.6 → 0.7…)
// through verified good behaviour, but per spec it must NEVER return to 1.0.

const MULTIPLIER_STEP    = 0.1
const MULTIPLIER_CEILING = 0.9
const MULTIPLIER_FLOOR   = 0.5

function resolveMultiplier(user, hasCritical, trigger) {
  let multiplier = user.trust?.multiplier ?? 1

  if (hasCritical) {
    if (multiplier >= 1) {
      // First time this account crosses into "confirmed critical" territory.
      multiplier = MULTIPLIER_FLOOR
    } else if (POSITIVE_TRIGGERS.has(trigger) && multiplier < MULTIPLIER_CEILING) {
      // Gradual recovery — only for genuinely positive marketplace events.
      multiplier = Math.min(MULTIPLIER_CEILING, Math.round((multiplier + MULTIPLIER_STEP) * 100) / 100)
    }
  }

  return multiplier
}

const POSITIVE_TRIGGERS = new Set(['transaction_completed', 'review_received'])

// ── Trust Badges (v2) ─────────────────────────────────────────────────────────

function computeBadgesV2({ user, pillars, displayed, eligibleDealCount, responseScore }) {
  const ageDays = Math.floor((Date.now() - new Date(user.createdAt)) / DAY_MS)
  const tier = tierFor(displayed)
  const existing = new Map((user.badges || []).map((b) => [b.id, b.earnedAt]))
  const earned = []

  const add = (id, label, description, icon) =>
    earned.push({ id, label, description, icon, earnedAt: existing.get(id) || new Date() })

  if (eligibleDealCount < 3 || ageDays < 30) {
    add('new_seller', 'New Seller', 'Less than 3 completed deals or joined within 30 days', 'new_seller')
  }
  if (pillars.identity === 20) {
    add('verified_seller', 'Verified Seller', 'Identity pillar fully verified (20/20)', 'verified_seller')
  }
  if (responseScore >= 5) {
    add('quick_responder', 'Quick Responder', 'Top-band response behaviour', 'quick_responder')
  }
  if ((tier.label === 'Established Member' || tier.label === 'Highly Trusted' || tier.label === 'Elite Trusted') && eligibleDealCount >= 5) {
    add('trusted_seller', 'Trusted Seller', 'Established Member+ with 5 or more successful deals', 'trusted_seller')
  }
  if (tier.label === 'Elite Trusted' && eligibleDealCount >= 10) {
    add('top_seller', 'Top Seller', 'Elite Trusted with 10 or more successful deals', 'top_seller')
  }

  return earned
}

// ── Progressive Trust Display ────────────────────────────────────────────────
// New users don't see a numerical score until they've earned the right to.

function isRevealed(user, eligibleDealCount, eligibleReviewCount) {
  if (eligibleDealCount >= 1) return true
  if (eligibleReviewCount >= 3) return true
  const monthsActive = (Date.now() - new Date(user.createdAt).getTime()) / MONTH_MS
  return monthsActive >= 3
}

// ── "Why buyers trust this member" — human-readable, generated dynamically ──

function buildTrustReasons(user, { identity, eligibleDealCount, reviewCount, weightedRating, moderationClean }) {
  const reasons = []
  if (identity.phoneVerified) reasons.push('Verified Phone')
  if (identity.emailVerified) reasons.push('Verified Email')
  if (identity.adminVerified) reasons.push('Verified Seller')
  reasons.push(`Member Since ${new Date(user.createdAt).getFullYear()}`)
  if (eligibleDealCount > 0) reasons.push(`${eligibleDealCount} Successful Deal${eligibleDealCount === 1 ? '' : 's'}`)
  if (reviewCount > 0) reasons.push(`${weightedRating} Average Rating`)
  if (moderationClean) reasons.push('No Confirmed Policy Violations')
  return reasons
}

// ── Trust History ─────────────────────────────────────────────────────────────

const HISTORY_CAP = 50

function pushHistoryEvent(user, { type, description, pillar = null, delta = 0 }) {
  user.trustHistory = user.trustHistory || []
  user.trustHistory.unshift({ type, description, pillar, delta, createdAt: new Date() })
  if (user.trustHistory.length > HISTORY_CAP) user.trustHistory = user.trustHistory.slice(0, HISTORY_CAP)
}

// ── Orchestrator ───────────────────────────────────────────────────────────────

/**
 * Recomputes every pillar, the multiplier, badges, reveal state, and reasons,
 * then persists them to the user document. Also appends a Trust History
 * entry when the triggering event is itself history-worthy.
 *
 * @param {string|object} userIdOrDoc
 * @param {{ trigger?: string, note?: string }} opts
 */
async function recalculateTrust(userIdOrDoc, opts = {}) {
  const { trigger = 'recalculation', note = '' } = opts

  const user = (userIdOrDoc && typeof userIdOrDoc.save === 'function')
    ? userIdOrDoc
    : await User.findById(userIdOrDoc)
  if (!user) return null

  // A permanently banned account (second confirmed critical) is frozen —
  // no further trust calculation, per spec.
  if (user.accountStatus === 'banned' && (user.criticalStrikes || 0) >= 2) {
    return user.trust || null
  }

  const listingCount = await Listing.countDocuments({ seller: user._id })
  const metrics = await computeResponseMetrics(user._id)
  const { pct: profileCompletionPct } = computeProfileCompletion(user, listingCount)

  const identity = identityPillar(user, profileCompletionPct)
  const eligibleDealCount = await countEligibleCompletedDeals(user._id)
  const transactions = transactionPillar(eligibleDealCount)

  const { eligible: eligibleReviews } = await getTrustEligibleReviews(user._id)
  const reviewsCalc = computeReviewsPillar(eligibleReviews)

  const activity = await activityPillar(user, metrics)
  const moderation = moderationPillar(user)

  const raw = Math.min(
    100,
    identity.score + transactions.score + reviewsCalc.pillar + activity.score + moderation.score
  )

  const multiplier = resolveMultiplier(user, moderation.hasCritical, trigger)
  const displayed = Math.round(raw * multiplier)

  const pillars = {
    identity:     identity.score,
    transactions: transactions.score,
    reviews:      Math.round(reviewsCalc.pillar * 10) / 10,
    activity:     activity.score,
    moderation:   moderation.score,
  }

  // Granular, own-dashboard-only detail behind each pillar — lets the
  // "Next steps to improve" UI give specific guidance without re-deriving
  // any trust logic client-side. Deliberately excludes the response-rate
  // formula itself (spec: "Do not expose the formula in UI").
  const details = {
    identity: {
      emailVerified:   identity.emailVerified,
      phoneVerified:   identity.phoneVerified,
      profileComplete: identity.profileComplete,
      adminVerified:   identity.adminVerified,
    },
    transactions: { eligibleDealCount },
    reviews:      { reviewCount: reviewsCalc.reviewCount, weightedRating: reviewsCalc.weightedRating, volumeBonus: reviewsCalc.volumeBonus },
    activity: {
      tenureScore:    activity.tenureScore,
      responseScore:  activity.responseScore,
      healthyScore:   activity.healthyScore,
      activeQuarters: activity.activeQuarters.length,
    },
    moderation: { clean: moderation.score === 20, hasCritical: moderation.hasCritical },
  }

  const tier = tierFor(displayed)
  const publicBadge = publicBadgeFor({
    tier: tier.label,
    moderationClean: moderation.score === 20,
    hasCritical: moderation.hasCritical,
  })
  const revealed = isRevealed(user, eligibleDealCount, reviewsCalc.reviewCount)
  const reasons = buildTrustReasons(user, {
    identity,
    eligibleDealCount,
    reviewCount: reviewsCalc.reviewCount,
    weightedRating: reviewsCalc.weightedRating,
    moderationClean: moderation.score === 20,
  })

  const badges = computeBadgesV2({
    user, pillars, displayed, eligibleDealCount, responseScore: activity.responseScore,
  })

  // ── Trust History — one entry per meaningful trigger, not per recompute ──
  const HISTORY_LABELS = {
    email_verified:            'Email Verified',
    phone_verified:            'Phone Verified',
    profile_completed:         'Profile Completed',
    transaction_completed:     'Transaction Completed',
    review_received:           'Review Received',
    verified_seller_approved:  'Verified Seller Approved',
    verified_seller_revoked:   'Verified Seller Status Revoked',
    listing_moderated:         'Listing Moderated',
    trust_recovery:            'Trust Recovery Applied',
  }
  if (HISTORY_LABELS[trigger]) {
    const previousDisplayed = user.trust?.displayed
    const delta = typeof previousDisplayed === 'number' ? displayed - previousDisplayed : 0
    pushHistoryEvent(user, {
      type: trigger,
      description: note || HISTORY_LABELS[trigger],
      delta,
    })
  }

  user.trustScore        = displayed
  user.profileCompletion = profileCompletionPct
  user.sellerMetrics      = metrics
  user.ghostRisk          = computeGhostRisk(metrics)
  user.badges             = badges
  user.activeQuarters     = activity.activeQuarters
  user.trust = {
    pillars,
    details,
    raw,
    multiplier,
    displayed,
    tier: tier.label,
    tierStars: tier.stars,
    publicBadge,
    revealed,
    reasons,
    lastCalculatedAt: new Date(),
  }

  await user.save()

  return user.trust
}

// ── Confirmed moderation entry point (called by adminListing.controller) ────

/**
 * Records a confirmed moderation action against a seller and immediately
 * recalculates their trust. Handles the "second critical moderation ⇒
 * permanent ban" rule.
 *
 * @returns {{ banned: boolean }}
 */
async function applyModerationPenalty(userId, { severity, reason = '', listingId = null }) {
  const user = await User.findById(userId)
  if (!user) return { banned: false }

  user.moderationRecord = user.moderationRecord || []
  user.moderationRecord.push({
    severity, reason, listing: listingId, confirmedAt: new Date(),
  })

  let banned = false
  if (severity === SEVERITY.CRITICAL) {
    user.criticalStrikes = (user.criticalStrikes || 0) + 1
    if (user.criticalStrikes >= 2) {
      user.accountStatus = 'banned'
      banned = true
    }
  }

  pushHistoryEvent(user, {
    type: 'listing_moderated',
    description: `Confirmed ${severity} moderation${reason ? `: ${reason}` : ''}`,
  })

  await user.save()

  if (!banned) {
    await recalculateTrust(user, { trigger: 'listing_moderated', note: reason })
  }

  return { banned }
}

module.exports = {
  recalculateTrust,
  applyModerationPenalty,
  tierFor,
  TIERS,
}
