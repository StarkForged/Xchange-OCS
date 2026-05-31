/**
 * Profile completion percentage (0–100), stored in user.profileCompletion.
 * Weights are deliberately different from trustScore — completion is about
 * what the user has filled in; trust is about credibility signals.
 */

const COMPLETION_WEIGHTS = {
  name:         10,
  email:        10,
  phone:        20,
  bio:          20,
  location:     15,
  profileImage: 15,
  hasListings:  10,
}

/**
 * @param {object} user         — Mongoose user doc or plain object
 * @param {number} listingCount — total listing count for this user
 * @returns {{ pct: number, checks: object }}
 */
function computeProfileCompletion(user, listingCount) {
  const checks = {
    name:         !!user.name?.trim(),
    email:        !!user.email?.trim(),
    phone:        !!user.phone?.trim(),
    bio:          !!user.bio?.trim(),
    location:     !!user.location?.trim(),
    profileImage: !!(user.profileImage?.trim()),
    hasListings:  listingCount > 0,
  }

  const pct = Object.entries(checks)
    .filter(([, done]) => done)
    .reduce((sum, [key]) => sum + COMPLETION_WEIGHTS[key], 0)

  return { pct: Math.min(pct, 100), checks }
}

module.exports = { computeProfileCompletion, COMPLETION_WEIGHTS }
