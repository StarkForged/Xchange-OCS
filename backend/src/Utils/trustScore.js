/**
 * Trust score computation (0–100).
 *
 * Six pillars — each separately capped so no single axis can dominate:
 *
 *   Identity               (28 max)  — verified profile fields
 *   Activity               (18 max)  — listing + messaging engagement
 *   Reputation             (20 max)  — response rate & speed
 *   Account Age            (14 max)  — time-gated trust; cannot be rushed
 *   Reviews                (10 max)  — completed transactions + average rating
 *   Transaction Reliability(10 max)  — completion rate; repeated cancellations penalise
 *
 * Total cap: 100. Repeated cancellations actively reduce the reliability pillar,
 * making unreliable traders visibly lower-scored.
 */

// ── Account age tier (absolute, not cumulative) ───────────────────────────────

function ageScoreTier(createdAt) {
  const days = Math.floor((Date.now() - new Date(createdAt)) / 86_400_000)
  if (days >= 180) return { score: 14, days }
  if (days >=  90) return { score: 11, days }
  if (days >=  30) return { score:  7, days }
  if (days >=   7) return { score:  3, days }
  return               { score:  0, days }
}

/**
 * @param {object} user          — Mongoose user doc or plain object
 * @param {number} listingCount  — total listings posted by this user
 * @param {object} [metrics]     — sellerMetrics from computeResponseMetrics
 *   { totalInquiries, respondedInquiries, responseRate, avgResponseTimeMs, lastActiveAt }
 * @param {object} [reviewStats] — { averageRating, reviewCount, completedDeals, cancelledDeals, completionRate }
 * @returns {{ score: number, breakdown: object }}
 */
function computeTrustScore(user, listingCount, metrics = {}, reviewStats = {}) {
  const { score: ageScore, days: ageDays } = ageScoreTier(user.createdAt)

  const rate       = metrics?.responseRate       ?? 0
  const ms         = metrics?.avgResponseTimeMs  ?? null
  const responded  = metrics?.respondedInquiries ?? 0

  const msSinceActive = metrics?.lastActiveAt
    ? Date.now() - new Date(metrics.lastActiveAt)
    : null
  const activeRecently = msSinceActive !== null && msSinceActive < 7 * 86_400_000

  // ── Identity (28 max) ─────────────────────────────────────────────────────
  const email        = !!user.email?.trim()
  const phone        = !!user.phone?.trim()
  const profileImage = !!(user.profileImage?.trim())
  const location     = !!user.location?.trim()
  const bio          = !!user.bio?.trim()

  const identityScore =
    (email        ? 10 : 0) +
    (phone        ?  8 : 0) +
    (profileImage ?  4 : 0) +
    (location     ?  3 : 0) +
    (bio          ?  3 : 0)

  // ── Activity (18 max) ─────────────────────────────────────────────────────
  const firstListing   = listingCount >= 1
  const threeListings  = listingCount >= 3
  const fiveListings   = listingCount >= 5
  const hasMessaging   = responded   >= 1    // has replied to at least one buyer

  const activityScore =
    (firstListing   ? 3 : 0) +
    (threeListings  ? 3 : 0) +
    (fiveListings   ? 4 : 0) +
    (activeRecently ? 4 : 0) +
    (hasMessaging   ? 4 : 0)

  // ── Reputation (20 max) ───────────────────────────────────────────────────
  // Rate tiers are mutually exclusive — take the higher one only.
  const responseRate90 = rate >= 90
  const responseRate70 = !responseRate90 && rate >= 70
  const fastResponder  = ms !== null && ms < 2 * 3_600_000   // avg reply < 2 h

  const reputationScore =
    (responseRate90 ? 10 : responseRate70 ? 5 : 0) +
    (fastResponder  ? 10 : 0)

  // ── Reviews (10 max) ──────────────────────────────────────────────────────
  const avgRating      = reviewStats?.averageRating ?? 0
  const reviewCount    = reviewStats?.reviewCount   ?? 0
  const completedDeals = reviewStats?.completedDeals ?? 0

  // First completed deal: +2; 3+ deals: +3; 5+ deals: +4
  const dealScore =
    completedDeals >= 5 ? 4 :
    completedDeals >= 3 ? 3 :
    completedDeals >= 1 ? 2 : 0

  // Average rating contribution: only counts when there are reviews
  const ratingScore =
    reviewCount >= 3 && avgRating >= 4.5 ? 6 :
    reviewCount >= 2 && avgRating >= 4.0 ? 4 :
    reviewCount >= 1 && avgRating >= 3.0 ? 2 : 0

  const reviewScore = Math.min(dealScore + ratingScore, 10)

  // ── Transaction Reliability (10 max) ──────────────────────────────────────
  // Uses only cancellations the user themselves caused; the other party's
  // cancellations do not reduce this user's reliability score.
  const responsibleCancellations = reviewStats?.responsibleCancellations ?? 0
  const buyerCancelledDeals       = reviewStats?.buyerCancelledDeals       ?? 0
  const sellerCancelledDeals      = reviewStats?.sellerCancelledDeals      ?? 0
  const completionRate            = reviewStats?.completionRate            ?? 100
  const totalResponsibleTx        = completedDeals + responsibleCancellations

  const reliabilityScore =
    totalResponsibleTx === 0  ? 5  :   // no history — neutral, benefit of the doubt
    completionRate >= 95      ? 10 :
    completionRate >= 85      ? 8  :
    completionRate >= 70      ? 5  :
    completionRate >= 50      ? 2  :
                                0

  const score = Math.min(
    identityScore + activityScore + reputationScore + ageScore + reviewScore + reliabilityScore,
    100
  )

  // Breakdown is a flat boolean/numeric map consumed by the frontend TrustChecklist.
  const breakdown = {
    // Identity
    email,
    phone,
    profileImage,
    location,
    bio,
    // Activity
    firstListing,
    threeListings,
    fiveListings,
    activeRecently,
    hasMessaging,
    // Reputation
    responseRate90,
    responseRate70,
    fastResponder,
    // Age (expose both raw and score for display)
    accountAgeDays:  ageDays,
    accountAgeScore: ageScore,
    // Reviews
    completedDeals,
    avgRating,
    reviewCount,
    reviewScore,
    // Transaction Reliability
    responsibleCancellations,
    buyerCancelledDeals,
    sellerCancelledDeals,
    completionRate,
    reliabilityScore,
  }

  return { score, breakdown }
}

module.exports = { computeTrustScore }
