/**
 * Phase 12D.1 — Trust visibility enforcement for buyer-facing browsing
 * endpoints (listings, recently-viewed, saved listings). These populate a
 * `seller` sub-document straight out of Mongo, so without this redaction the
 * raw numeric trust score and full pillar/multiplier detail would leak to
 * any client inspecting the network response — even though no page renders
 * it. This is the single choke point that strips it back down to just the
 * public trust badge before a listing (or list of listings) is serialized.
 *
 * Server-side ranking (qualityScore, etc.) must read `seller.trust.displayed`
 * BEFORE calling this — it deletes that field.
 */

function toPublicSeller(seller) {
  if (!seller || typeof seller !== 'object') return seller
  const { trustScore, trust, ...rest } = seller
  return { ...rest, trust: { publicBadge: trust?.publicBadge || null } }
}

function redactListingSeller(listing) {
  if (listing?.seller && typeof listing.seller === 'object') {
    listing.seller = toPublicSeller(listing.seller)
  }
  return listing
}

function redactListingsSeller(listings) {
  return (listings || []).map(redactListingSeller)
}

module.exports = { toPublicSeller, redactListingSeller, redactListingsSeller }
