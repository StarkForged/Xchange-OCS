/**
 * Seller reputation utilities.
 *
 * computeResponseMetrics — analyses Chat + Message collections to derive
 *   response rate, average response time, and last-active timestamp.
 *   Called on profile fetch, not in the socket hot path.
 *
 * computeGhostRisk — scores ghost-seller likelihood (0–100) based on
 *   unresponsiveness and inactivity.
 *
 * computeBadges — evaluates badge criteria and returns earned badges,
 *   preserving original earnedAt timestamps so they don't reset on recompute.
 */

const Chat    = require('../Models/Chat')
const Message = require('../Models/Message')
const Listing = require('../Models/Listing')

// ── Badge definitions ─────────────────────────────────────────────────────────

const BADGE_DEFS = [
  {
    id:          'new_seller',
    label:       'New Seller',
    description: 'Recently joined the marketplace',
    icon:        'new_seller',
    check: (_u, _m, _lc, ageDays) => ageDays < 30,
  },
  {
    id:          'verified_seller',
    label:       'Verified Seller',
    description: 'Profile 70%+ complete with a trust score of 60+',
    icon:        'verified_seller',
    check: (u, _m, _lc, _ad, profileCompletion) =>
      u.trustScore >= 60 && profileCompletion >= 70,
  },
  {
    id:          'active_seller',
    label:       'Active Seller',
    description: 'Has 3 or more listings posted',
    icon:        'active_seller',
    check: (_u, _m, listingCount) => listingCount >= 3,
  },
  {
    id:          'responsive_seller',
    label:       'Responsive Seller',
    description: 'Replies to 80%+ of buyer messages (min 5 inquiries)',
    icon:        'responsive_seller',
    check: (_u, m) => m.totalInquiries >= 5 && m.responseRate >= 80,
  },
  {
    id:          'quick_responder',
    label:       'Quick Responder',
    description: 'Average reply time under 2 hours (min 3 inquiries)',
    icon:        'quick_responder',
    check: (_u, m) =>
      m.avgResponseTimeMs !== null &&
      m.avgResponseTimeMs < 2 * 3_600_000 &&
      m.totalInquiries >= 3,
  },
  {
    id:          'trusted_seller',
    label:       'Trusted Seller',
    description: 'Trust score of 80 or higher',
    icon:        'trusted_seller',
    check: (u) => u.trustScore >= 80,
  },
  {
    id:          'veteran_seller',
    label:       'Veteran Seller',
    description: 'Member for 1 year or more',
    icon:        'veteran_seller',
    check: (_u, _m, _lc, ageDays) => ageDays >= 365,
  },
]

// ── Response metrics ──────────────────────────────────────────────────────────

async function computeResponseMetrics(sellerId) {
  const listingIds = await Listing.find({ seller: sellerId }).distinct('_id')

  const empty = {
    totalInquiries:     0,
    respondedInquiries: 0,
    responseRate:       0,
    avgResponseTimeMs:  null,
    lastActiveAt:       null,
  }

  if (!listingIds.length) return empty

  const chats = await Chat.find({ listing: { $in: listingIds } }).select('_id').lean()
  if (!chats.length) return empty

  const chatIds     = chats.map((c) => c._id)
  const sellerStr   = String(sellerId)

  let totalInquiries     = 0
  let respondedInquiries = 0
  let totalResponseMs    = 0
  let responseMsCount    = 0

  // Analyse each chat in parallel — one Message query per chat
  await Promise.all(
    chatIds.map(async (chatId) => {
      const msgs = await Message.find({ chat: chatId })
        .select('sender createdAt')
        .sort({ createdAt: 1 })
        .lean()

      if (!msgs.length) return

      // First message from a non-seller participant = buyer opening the conversation
      const firstBuyerMsg = msgs.find((m) => String(m.sender) !== sellerStr)
      if (!firstBuyerMsg) return  // only seller messages — skip

      totalInquiries++

      // Seller's first reply strictly after the buyer's first message
      const firstReply = msgs.find(
        (m) =>
          String(m.sender) === sellerStr &&
          m.createdAt > firstBuyerMsg.createdAt
      )

      if (firstReply) {
        respondedInquiries++
        const ms = new Date(firstReply.createdAt) - new Date(firstBuyerMsg.createdAt)
        if (ms > 0) {
          totalResponseMs += ms
          responseMsCount++
        }
      }
    })
  )

  // Most recent message the seller sent across all their selling chats
  const lastMsg = await Message.findOne({ chat: { $in: chatIds }, sender: sellerId })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean()

  const responseRate = totalInquiries > 0
    ? Math.round((respondedInquiries / totalInquiries) * 100)
    : 0

  const avgResponseTimeMs = responseMsCount > 0
    ? Math.round(totalResponseMs / responseMsCount)
    : null

  return {
    totalInquiries,
    respondedInquiries,
    responseRate,
    avgResponseTimeMs,
    lastActiveAt: lastMsg?.createdAt ?? null,
  }
}

// ── Ghost risk ────────────────────────────────────────────────────────────────

/**
 * Ghost seller score (0–100). A seller is flagged (score >= 50) if they have
 * a poor response record AND have been inactive for an extended period.
 */
function computeGhostRisk(metrics) {
  const { totalInquiries, responseRate, lastActiveAt } = metrics
  let score = 0

  if (totalInquiries >= 3 && responseRate <  20) score += 25
  if (totalInquiries >= 5 && responseRate <  10) score += 25  // cumulative

  const msSinceActive = lastActiveAt
    ? Date.now() - new Date(lastActiveAt)
    : null

  if (msSinceActive !== null && msSinceActive > 14 * 86_400_000) score += 25
  if (msSinceActive !== null && msSinceActive > 30 * 86_400_000) score += 25  // cumulative

  return {
    score:       Math.min(score, 100),
    flagged:     score >= 50,
    lastChecked: new Date(),
  }
}

// ── Badge computation ─────────────────────────────────────────────────────────

/**
 * Evaluates all badge criteria and returns the earned badge list.
 * Existing earnedAt timestamps are preserved to prevent date-resets on recompute.
 *
 * @param {object} user             — user doc (plain object)
 * @param {object} metrics          — from computeResponseMetrics
 * @param {number} listingCount
 * @param {number} profileCompletion — 0–100 from computeProfileCompletion
 * @param {number} trustScore        — freshly computed value (not user.trustScore)
 */
function computeBadges(user, metrics, listingCount, profileCompletion, trustScore) {
  const ageDays       = Math.floor((Date.now() - new Date(user.createdAt)) / 86_400_000)
  const userForBadges = { ...user, trustScore }         // use fresh score, not stale DB value
  const existing      = new Map((user.badges || []).map((b) => [b.id, b.earnedAt]))

  return BADGE_DEFS
    .filter((b) => b.check(userForBadges, metrics, listingCount, ageDays, profileCompletion))
    .map((b) => ({
      id:          b.id,
      label:       b.label,
      description: b.description,
      icon:        b.icon,
      earnedAt:    existing.get(b.id) || new Date(),
    }))
}

module.exports = {
  computeResponseMetrics,
  computeGhostRisk,
  computeBadges,
  BADGE_DEFS,
}
