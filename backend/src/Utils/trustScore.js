/**
 * Trust score computation (0–100).
 *
 * Four pillars — each separately capped so no single axis can dominate:
 *
 *   Identity     (35 max)  — verified profile fields
 *   Activity     (25 max)  — listing + messaging engagement
 *   Reputation   (20 max)  — response rate & speed
 *   Account Age  (20 max)  — time-gated trust; cannot be rushed
 *
 * Design intent: a brand-new user filling every profile field still cannot
 * exceed ~65 pts until they have real activity and tenure. Reaching 90+ pts
 * requires all four pillars to be mature.
 */

// ── Account age tier (absolute, not cumulative) ───────────────────────────────

function ageScoreTier(createdAt) {
  const days = Math.floor((Date.now() - new Date(createdAt)) / 86_400_000)
  if (days >= 180) return { score: 20, days }
  if (days >=  90) return { score: 15, days }
  if (days >=  30) return { score: 10, days }
  if (days >=   7) return { score:  5, days }
  return               { score:  0, days }
}

/**
 * @param {object} user          — Mongoose user doc or plain object
 * @param {number} listingCount  — total listings posted by this user
 * @param {object} [metrics]     — sellerMetrics from computeResponseMetrics
 *   { totalInquiries, respondedInquiries, responseRate, avgResponseTimeMs, lastActiveAt }
 * @returns {{ score: number, breakdown: object }}
 */
function computeTrustScore(user, listingCount, metrics = {}) {
  const { score: ageScore, days: ageDays } = ageScoreTier(user.createdAt)

  const rate       = metrics?.responseRate       ?? 0
  const ms         = metrics?.avgResponseTimeMs  ?? null
  const responded  = metrics?.respondedInquiries ?? 0

  const msSinceActive = metrics?.lastActiveAt
    ? Date.now() - new Date(metrics.lastActiveAt)
    : null
  const activeRecently = msSinceActive !== null && msSinceActive < 7 * 86_400_000

  // ── Identity (35 max) ─────────────────────────────────────────────────────
  const email        = !!user.email?.trim()
  const phone        = !!user.phone?.trim()
  const profileImage = !!(user.profileImage?.trim())
  const location     = !!user.location?.trim()
  const bio          = !!user.bio?.trim()

  const identityScore =
    (email        ? 10 : 0) +
    (phone        ? 10 : 0) +
    (profileImage ?  5 : 0) +
    (location     ?  5 : 0) +
    (bio          ?  5 : 0)

  // ── Activity (25 max) ─────────────────────────────────────────────────────
  const firstListing   = listingCount >= 1
  const threeListings  = listingCount >= 3
  const fiveListings   = listingCount >= 5
  const hasMessaging   = responded   >= 1    // has replied to at least one buyer

  const activityScore =
    (firstListing   ? 5 : 0) +
    (threeListings  ? 5 : 0) +
    (fiveListings   ? 5 : 0) +
    (activeRecently ? 5 : 0) +
    (hasMessaging   ? 5 : 0)

  // ── Reputation (20 max) ───────────────────────────────────────────────────
  // Rate tiers are mutually exclusive — take the higher one only.
  const responseRate90 = rate >= 90
  const responseRate70 = !responseRate90 && rate >= 70
  const fastResponder  = ms !== null && ms < 2 * 3_600_000   // avg reply < 2 h

  const reputationScore =
    (responseRate90 ? 10 : responseRate70 ? 5 : 0) +
    (fastResponder  ? 10 : 0)

  const score = Math.min(identityScore + activityScore + reputationScore + ageScore, 100)

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
  }

  return { score, breakdown }
}

module.exports = { computeTrustScore }
