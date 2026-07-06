/**
 * Reviews pillar (Phase 12D Trust Framework v2) — Bayesian weighted rating
 * plus reciprocal-review protection.
 *
 * Reciprocal Review Protection: only the first two reviews exchanged between
 * the same counterparty pair count toward trust. This stops two colluding
 * accounts from farming trust by repeatedly transacting with (and reviewing)
 * only each other. Every review still remains visible on the profile —
 * `getTrustEligibleReviews` never deletes or hides anything, it only tells
 * the trust engine which ones to weigh.
 */

const Review = require('../Models/Review')

const MAX_REVIEWS_PER_COUNTERPARTY = 2
const BAYESIAN_PRIOR_MEAN  = 3.5
const BAYESIAN_PRIOR_COUNT = 5

// Reviews pillar caps
const RATING_MAX_POINTS = 16
const VOLUME_BONUS_MAX  = 4
const PILLAR_MAX        = 20

/**
 * @param {string} revieweeId
 * @returns {{ all: object[], eligible: object[] }}
 */
async function getTrustEligibleReviews(revieweeId) {
  const all = await Review.find({ reviewee: revieweeId })
    .select('reviewer rating createdAt')
    .sort({ createdAt: 1 })
    .lean()

  const seenPerCounterparty = new Map()
  const eligible = []

  for (const review of all) {
    const key = String(review.reviewer)
    const count = seenPerCounterparty.get(key) || 0
    if (count < MAX_REVIEWS_PER_COUNTERPARTY) {
      eligible.push(review)
    }
    seenPerCounterparty.set(key, count + 1)
  }

  return { all, eligible }
}

/**
 * Bayesian-weighted rating, converted to a 0–20 pillar score:
 *   16 points max from the weighted rating itself
 *   +4 points max volume bonus (+1 per 5 trust-eligible reviews)
 */
function computeReviewsPillar(eligibleReviews) {
  const reviewCount = eligibleReviews.length

  if (reviewCount === 0) {
    return { pillar: 0, weightedRating: 0, reviewCount: 0, volumeBonus: 0 }
  }

  const sum = eligibleReviews.reduce((acc, r) => acc + r.rating, 0)
  const avgRating = sum / reviewCount

  const weightedRating =
    (avgRating * reviewCount + BAYESIAN_PRIOR_MEAN * BAYESIAN_PRIOR_COUNT) /
    (reviewCount + BAYESIAN_PRIOR_COUNT)

  // weightedRating lives on a 0–5 scale; map linearly onto the 16-point cap.
  const ratingPoints = Math.min(RATING_MAX_POINTS, (weightedRating / 5) * RATING_MAX_POINTS)
  const volumeBonus  = Math.min(VOLUME_BONUS_MAX, Math.floor(reviewCount / 5))

  const pillar = Math.min(PILLAR_MAX, ratingPoints + volumeBonus)

  return {
    pillar,
    weightedRating: Math.round(weightedRating * 10) / 10,
    reviewCount,
    volumeBonus,
  }
}

module.exports = {
  getTrustEligibleReviews,
  computeReviewsPillar,
  MAX_REVIEWS_PER_COUNTERPARTY,
}
