/**
 * Seller reputation utilities.
 *
 * computeResponseMetrics — analyses Chat + Message collections to derive
 *   response rate, average response time, and last-active timestamp.
 *   Called by trustEngine.js (Marketplace Activity pillar), not in the
 *   socket hot path.
 *
 * computeGhostRisk — scores ghost-seller likelihood (0–100) based on
 *   unresponsiveness and inactivity. Independent of the trust score.
 *
 * Badge computation now lives in trustEngine.js (Phase 12D) — it needs
 * pillar values this module doesn't have. Kept out of here to avoid two
 * competing badge definitions.
 */

const Chat    = require('../Models/Chat')
const Message = require('../Models/Message')
const Listing = require('../Models/Listing')

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

module.exports = {
  computeResponseMetrics,
  computeGhostRisk,
}
