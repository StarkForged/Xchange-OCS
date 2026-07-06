/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Analytics Service (Phase 12E)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Domain-level analytics aggregations for the Admin Analytics Dashboard.
 * Every function here talks directly to MongoDB via aggregation pipelines —
 * no business logic (trust, moderation, reports, transactions, reviews) is
 * modified or re-implemented; this module only *reads* and *summarizes* what
 * already exists.
 *
 * Kept deliberately flat (one function per domain) so dashboard.service.js
 * can compose them for the overview/health/insights endpoints without any
 * duplicated aggregation logic.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const User    = require('../Models/User')
const Listing = require('../Models/Listing')
const Review  = require('../Models/Review')
const Report  = require('../Models/Report')

const DAY_MS = 86_400_000

// ── Shared helpers ────────────────────────────────────────────────────────────

function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n, from = new Date()) {
  return new Date(from.getTime() - n * DAY_MS)
}

/** Turns a sparse `[{ _id: 'YYYY-MM-DD', count }]` aggregation result into a
 *  dense day-by-day series (missing days filled with 0) so charts never show
 *  gaps. */
function fillDaySeries(rows, days) {
  const map = new Map(rows.map((r) => [r._id, r.count]))
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i)
    const key = d.toISOString().split('T')[0]
    out.push({ date: key, count: map.get(key) || 0 })
  }
  return out
}

function round(n, dp = 0) {
  const f = 10 ** dp
  return Math.round((n || 0) * f) / f
}

function pct(numerator, denominator) {
  if (!denominator) return 0
  return round((numerator / denominator) * 100, 1)
}

const DATE_GROUP = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field } })

// The six public-facing trust badges, in display order (see
// backend/src/Services/trustEngine.js publicBadgeFor / PUBLIC_BADGE_MAP).
const TRUST_TIER_ORDER = [
  'Elite Trusted', 'Trusted Member', 'Established Member',
  'Building Trust', 'Buy Carefully', 'Restricted',
]

function trustTierSeries(rows) {
  const map = new Map(rows.map((r) => [r._id, r.count]))
  return TRUST_TIER_ORDER.map((label) => ({ name: label, value: map.get(label) || 0 }))
}

// ── User Analytics ────────────────────────────────────────────────────────────

async function getUserAnalytics() {
  const todayStart = startOfDay()
  const since30 = daysAgo(30)

  const [
    totalBuyers, totalSellers, verifiedSellers,
    newToday, activeToday, suspended, banned,
    registrations, tierRows, roleRows,
  ] = await Promise.all([
    User.countDocuments({ role: 'buyer' }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: 'seller', isVerifiedSeller: true }),
    User.countDocuments({ createdAt: { $gte: todayStart } }),
    User.countDocuments({ 'sellerMetrics.lastActiveAt': { $gte: todayStart } }),
    User.countDocuments({ accountStatus: 'suspended' }),
    User.countDocuments({ accountStatus: 'banned' }),
    User.aggregate([
      { $match: { createdAt: { $gte: since30 }, role: { $ne: 'admin' } } },
      { $group: { _id: DATE_GROUP('$createdAt'), count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $group: { _id: '$trust.publicBadge.label', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
  ])

  return {
    cards: { totalBuyers, totalSellers, verifiedSellers, newToday, activeToday, suspended, banned },
    charts: {
      registrations: fillDaySeries(registrations, 30),
      roleRatio: roleRows.map((r) => ({ name: r._id === 'buyer' ? 'Buyers' : 'Sellers', value: r.count })),
      verificationDistribution: [
        { name: 'Verified Sellers', value: verifiedSellers },
        { name: 'Unverified Sellers', value: Math.max(totalSellers - verifiedSellers, 0) },
      ],
      trustTierDistribution: trustTierSeries(tierRows),
    },
  }
}

// ── Listing Analytics ─────────────────────────────────────────────────────────

async function getListingAnalytics() {
  const since30 = daysAgo(30)

  const [
    active, sold, removed, underReview, featured,
    avgPriceAgg, byCategory, createdSeries, byCategoryViews,
  ] = await Promise.all([
    Listing.countDocuments({ status: 'active', isHidden: { $ne: true } }),
    Listing.countDocuments({ status: 'sold' }),
    Listing.countDocuments({ status: 'removed' }),
    Listing.countDocuments({ isHidden: true, status: { $ne: 'removed' } }),
    Listing.countDocuments({ featured: true }),
    Listing.aggregate([
      { $match: { status: { $ne: 'removed' } } },
      { $group: { _id: null, avg: { $avg: '$price.amount' } } },
    ]),
    Listing.aggregate([
      { $match: { status: { $ne: 'removed' } } },
      { $group: { _id: '$category.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Listing.aggregate([
      { $match: { createdAt: { $gte: since30 } } },
      { $group: { _id: DATE_GROUP('$createdAt'), count: { $sum: 1 } } },
    ]),
    Listing.aggregate([
      { $match: { status: { $ne: 'removed' } } },
      { $group: { _id: '$category.name', views: { $sum: '$viewsCount' } } },
      { $sort: { views: -1 } },
    ]),
  ])

  // Status distribution — mirrors the same bucket precedence the admin UI
  // already uses (removed > under review > raw status).
  const statusBuckets = await Listing.aggregate([
    {
      $project: {
        bucket: {
          $switch: {
            branches: [
              { case: { $eq: ['$status', 'removed'] }, then: 'Removed' },
              { case: { $eq: ['$isHidden', true] }, then: 'Under Review' },
              { case: { $eq: ['$status', 'active'] }, then: 'Active' },
              { case: { $eq: ['$status', 'paused'] }, then: 'Paused' },
              { case: { $eq: ['$status', 'sold'] }, then: 'Sold' },
            ],
            default: 'Other',
          },
        },
      },
    },
    { $group: { _id: '$bucket', count: { $sum: 1 } } },
  ])

  return {
    cards: {
      active, sold, removed, underReview, featured,
      averagePrice: round(avgPriceAgg[0]?.avg || 0),
    },
    charts: {
      listingsByCategory: byCategory.map((c) => ({ name: c._id || 'Uncategorized', value: c.count })),
      listingsCreatedOverTime: fillDaySeries(createdSeries, 30),
      statusDistribution: statusBuckets.map((s) => ({ name: s._id, value: s.count })),
      topCategories: byCategory.slice(0, 5).map((c) => ({ name: c._id || 'Uncategorized', value: c.count })),
      mostViewedCategories: byCategoryViews.slice(0, 5).map((c) => ({ name: c._id || 'Uncategorized', value: c.views || 0 })),
    },
  }
}

// ── Transaction Analytics ─────────────────────────────────────────────────────
// "Transactions" live embedded on Listing.transaction — there is no separate
// collection, so every figure here is derived straight from Listing.

async function getTransactionAnalytics() {
  const since30 = daysAgo(30)

  const [
    successful, cancelled,
    completedSeries, cancelledSeries,
    durationAgg,
  ] = await Promise.all([
    Listing.countDocuments({ 'transaction.completedAt': { $ne: null } }),
    Listing.countDocuments({ 'transaction.cancelled': true }),
    Listing.aggregate([
      { $match: { 'transaction.completedAt': { $gte: since30, $ne: null } } },
      { $group: { _id: DATE_GROUP('$transaction.completedAt'), count: { $sum: 1 } } },
    ]),
    Listing.aggregate([
      { $match: { 'transaction.cancelledAt': { $gte: since30, $ne: null } } },
      { $group: { _id: DATE_GROUP('$transaction.cancelledAt'), count: { $sum: 1 } } },
    ]),
    // Average time from listing creation to deal completion — the only
    // "start" timestamp the schema actually records; labelled transparently
    // in the UI rather than implying a precise in-transaction duration.
    Listing.aggregate([
      { $match: { 'transaction.completedAt': { $ne: null } } },
      { $project: { durationMs: { $subtract: ['$transaction.completedAt', '$createdAt'] } } },
      { $group: { _id: null, avg: { $avg: '$durationMs' } } },
    ]),
  ])

  const avgCompletionDays = durationAgg[0]?.avg ? round(durationAgg[0].avg / DAY_MS, 1) : 0

  return {
    cards: {
      successful,
      cancelled,
      completionRate: pct(successful, successful + cancelled),
      avgCompletionDays,
    },
    charts: {
      transactionsOverTime: fillDaySeries(completedSeries, 30),
      completionVsCancellation: [
        { name: 'Completed', value: successful },
        { name: 'Cancelled', value: cancelled },
      ],
      cancelledOverTime: fillDaySeries(cancelledSeries, 30),
    },
  }
}

// ── Review Analytics ──────────────────────────────────────────────────────────

async function getReviewAnalytics() {
  const [totalReviews, ratingRows, avgAgg, completedDealListings] = await Promise.all([
    Review.countDocuments(),
    Review.aggregate([{ $group: { _id: '$rating', count: { $sum: 1 } } }]),
    Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    // Every completed transaction has up to 2 review "slots" (buyer + seller).
    // Pending = slots not yet filled — a real, derivable figure, not a guess.
    Listing.countDocuments({ 'transaction.completedAt': { $ne: null } }),
  ])

  const expectedReviewSlots = completedDealListings * 2
  const pendingReviews = Math.max(expectedReviewSlots - totalReviews, 0)

  const ratingMap = new Map(ratingRows.map((r) => [r._id, r.count]))
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    name: `${star}★`, value: ratingMap.get(star) || 0,
  }))

  return {
    cards: {
      submitted: totalReviews,
      averageRating: round(avgAgg[0]?.avg || 0, 1),
      pending: pendingReviews,
    },
    charts: { ratingDistribution },
  }
}

// ── Report Analytics ──────────────────────────────────────────────────────────

const OPEN_STATUSES = ['submitted', 'in_review', 'waiting_for_evidence']

async function getReportAnalytics() {
  const since30 = daysAgo(30)

  const [
    total, underReview, resolved, dismissed, openTotal,
    reasonRows, priorityRows, overTimeRows,
  ] = await Promise.all([
    Report.countDocuments(),
    Report.countDocuments({ status: 'in_review' }),
    Report.countDocuments({ status: 'resolved' }),
    Report.countDocuments({ status: 'dismissed' }),
    Report.countDocuments({ status: { $in: OPEN_STATUSES } }),
    Report.aggregate([{ $group: { _id: '$reason', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Report.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Report.aggregate([
      { $match: { createdAt: { $gte: since30 } } },
      { $group: { _id: DATE_GROUP('$createdAt'), count: { $sum: 1 } } },
    ]),
  ])

  const priorityMap = new Map(priorityRows.map((r) => [r._id, r.count]))

  return {
    cards: { total, open: openTotal, underReview, resolved, dismissed },
    charts: {
      byReason: reasonRows.map((r) => ({ name: r._id, value: r.count })),
      overTime: fillDaySeries(overTimeRows, 30),
      priorityDistribution: ['critical', 'high', 'medium', 'low'].map((p) => ({
        name: p.charAt(0).toUpperCase() + p.slice(1), value: priorityMap.get(p) || 0,
      })),
    },
  }
}

// ── Trust Analytics ───────────────────────────────────────────────────────────

async function getTrustAnalytics() {
  const since30 = daysAgo(30)

  const [
    avgTrustAgg, verifiedMembers, permanentBans,
    criticalCases, appealsPending, tierRows,
    growthRows, moderationRows,
  ] = await Promise.all([
    User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $group: { _id: null, avg: { $avg: '$trustScore' } } },
    ]),
    User.countDocuments({ isVerifiedSeller: true }),
    User.countDocuments({ accountStatus: 'banned' }),
    User.countDocuments({ criticalStrikes: { $gte: 1 } }),
    User.aggregate([
      { $unwind: '$moderationRecord' },
      { $match: { 'moderationRecord.appealStatus': 'pending' } },
      { $count: 'count' },
    ]),
    User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $group: { _id: '$trust.publicBadge.label', count: { $sum: 1 } } },
    ]),
    // Net trust movement per day — summed from every user's real trustHistory
    // delta entries, not a synthetic curve.
    User.aggregate([
      { $unwind: '$trustHistory' },
      { $match: { 'trustHistory.createdAt': { $gte: since30 } } },
      { $group: { _id: DATE_GROUP('$trustHistory.createdAt'), netDelta: { $sum: '$trustHistory.delta' } } },
    ]),
    // Confirmed moderation actions platform-wide, grouped by severity.
    User.aggregate([
      { $unwind: '$moderationRecord' },
      { $group: { _id: '$moderationRecord.severity', count: { $sum: 1 } } },
    ]),
  ])

  const growthMap = new Map(growthRows.map((r) => [r._id, r.netDelta]))
  const trustGrowth = []
  for (let i = 29; i >= 0; i--) {
    const d = daysAgo(i)
    const key = d.toISOString().split('T')[0]
    trustGrowth.push({ date: key, netDelta: round(growthMap.get(key) || 0, 1) })
  }

  const modMap = new Map(moderationRows.map((r) => [r._id, r.count]))

  return {
    cards: {
      averageTrust: round(avgTrustAgg[0]?.avg || 0),
      verifiedMembers,
      criticalModerationCases: criticalCases,
      appealsPending: appealsPending[0]?.count || 0,
      permanentBans,
    },
    charts: {
      trustTierDistribution: trustTierSeries(tierRows),
      trustGrowth,
      moderationImpact: ['minor', 'medium', 'critical'].map((s) => ({
        name: s.charAt(0).toUpperCase() + s.slice(1), value: modMap.get(s) || 0,
      })),
    },
  }
}

module.exports = {
  startOfDay,
  daysAgo,
  fillDaySeries,
  round,
  pct,
  DATE_GROUP,
  TRUST_TIER_ORDER,
  getUserAnalytics,
  getListingAnalytics,
  getTransactionAnalytics,
  getReviewAnalytics,
  getReportAnalytics,
  getTrustAnalytics,
}
