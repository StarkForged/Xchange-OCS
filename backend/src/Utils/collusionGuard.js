/**
 * Anti-collusion architecture (Phase 12D).
 *
 * Trust must never be inflatable by fake back-and-forth deals between the
 * same two accounts. This module is the single choke point every completed-
 * transaction count passes through before it is allowed to contribute to
 * trust — so when real collusion detection ships later (pattern analysis on
 * transaction velocity, repeat buyer/seller pairs, price anomalies, etc.) it
 * only needs to flip `listing.transaction.flaggedSuspicious` and every
 * consumer of this helper automatically stops counting that deal.
 *
 * Deliberately NOT fingerprinting-based — that's a detection *mechanism*,
 * this is the *policy* boundary detection results are checked against.
 */

/**
 * @param {object} listing — a Listing doc/lean object with a `transaction` subdocument
 * @returns {boolean} true if this completed transaction may count toward trust
 */
function isTransactionEligibleForTrust(listing) {
  if (!listing) return false
  if (!listing.transaction?.completedAt) return false
  if (listing.transaction.flaggedSuspicious) return false
  return true
}

module.exports = { isTransactionEligibleForTrust }
