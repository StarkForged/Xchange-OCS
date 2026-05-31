/**
 * Trust score computation (0–100).
 *
 * Profile completeness is the primary driver — weights intentionally match the
 * point labels displayed in ProfilePage.TrustChecklist. Do NOT change weights
 * without updating the UI labels at the same time.
 *
 * Response reputation adds bonus points on top (capped at 100 overall), so a
 * seller with a partially-complete profile can still reach 100 through consistent
 * responsiveness, and a fully-complete profile always stays at 100.
 */

const PROFILE_WEIGHTS = {
  name:         10,
  email:        10,
  phone:        20,
  bio:          15,
  location:     10,
  profileImage: 15,
  hasListings:  10,
  accountAge:   10,
}

/**
 * @param {object} user          — Mongoose user doc or plain object
 * @param {number} listingCount  — total listing count for this user
 * @param {object} [metrics]     — sellerMetrics { responseRate, avgResponseTimeMs }
 * @returns {{ score: number, breakdown: object }}
 */
function computeTrustScore(user, listingCount, metrics = {}) {
  const ageDays = Math.floor((Date.now() - new Date(user.createdAt)) / 86400000)

  const breakdown = {
    name:         !!user.name?.trim(),
    email:        !!user.email?.trim(),
    phone:        !!user.phone?.trim(),
    bio:          !!user.bio?.trim(),
    location:     !!user.location?.trim(),
    profileImage: !!(user.profileImage?.trim()),
    hasListings:  listingCount > 0,
    accountAge:   ageDays >= 30,
  }

  const profileScore = Object.entries(breakdown)
    .filter(([, done]) => done)
    .reduce((sum, [key]) => sum + PROFILE_WEIGHTS[key], 0)

  // Response bonus — adds up to 25 pts, does not affect breakdown keys
  const rate         = metrics?.responseRate    ?? 0
  const ms           = metrics?.avgResponseTimeMs ?? null
  let   responseBonus = 0
  if (rate >= 25)                          responseBonus += 5
  if (rate >= 50)                          responseBonus += 5
  if (rate >= 75)                          responseBonus += 5
  if (ms !== null && ms < 4 * 3_600_000)  responseBonus += 5   // < 4 h
  if (ms !== null && ms <     3_600_000)  responseBonus += 5   // < 1 h

  return {
    score:     Math.min(profileScore + responseBonus, 100),
    breakdown,
  }
}

module.exports = { computeTrustScore, PROFILE_WEIGHTS }
