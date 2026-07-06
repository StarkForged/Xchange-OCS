/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Dashboard Service (Phase 12E)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Composes analytics.service.js's per-domain aggregations into the three
 * cross-cutting things the Admin Dashboard needs that don't belong to any
 * single domain: the top overview cards, the Marketplace Health Score, the
 * live activity feed, and the calculated insights panel.
 *
 * Nothing here mutates data or touches trust/report/transaction/review
 * business logic — it only reads and summarizes.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const User           = require('../Models/User')
const Listing        = require('../Models/Listing')
const Review         = require('../Models/Review')
const Report         = require('../Models/Report')
const ModerationLog  = require('../Models/ModerationLog')
const { startOfDay, daysAgo, round, pct } = require('./analytics.service')

const OPEN_STATUSES = ['submitted', 'in_review', 'waiting_for_evidence']
const FRAUD_REASONS = ['scam_fraud', 'fraud']

// ── Overview (top summary cards) ─────────────────────────────────────────────

async function getOverview() {
  const todayStart = startOfDay()

  const [
    totalUsers, newUsersToday,
    totalListings, listingsToday,
    successfulTx, txToday,
    totalReviews, reviewsToday,
    activeReports, reportsToday,
    underReviewListings,
    suspendedUsers,
    health,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({ role: { $ne: 'admin' }, createdAt: { $gte: todayStart } }),
    Listing.countDocuments({ status: { $ne: 'removed' } }),
    Listing.countDocuments({ createdAt: { $gte: todayStart } }),
    Listing.countDocuments({ 'transaction.completedAt': { $ne: null } }),
    Listing.countDocuments({ 'transaction.completedAt': { $gte: todayStart } }),
    Review.countDocuments(),
    Review.countDocuments({ createdAt: { $gte: todayStart } }),
    Report.countDocuments({ status: { $in: OPEN_STATUSES } }),
    Report.countDocuments({ createdAt: { $gte: todayStart } }),
    Listing.countDocuments({ isHidden: true, status: { $ne: 'removed' } }),
    User.countDocuments({ accountStatus: 'suspended' }),
    getMarketplaceHealth(),
  ])

  return {
    totalUsers:            { value: totalUsers,        today: newUsersToday },
    totalListings:         { value: totalListings,     today: listingsToday },
    successfulTransactions:{ value: successfulTx,       today: txToday },
    totalReviews:          { value: totalReviews,       today: reviewsToday },
    activeReports:         { value: activeReports,      today: reportsToday },
    listingsUnderReview:   { value: underReviewListings },
    suspendedUsers:        { value: suspendedUsers },
    marketplaceHealth:     { value: health.score, label: health.label },
  }
}

// ── Marketplace Health Score ──────────────────────────────────────────────────

function healthLabel(score) {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Needs Attention'
}

async function getMarketplaceHealth() {
  const since30 = daysAgo(30)

  const [
    successfulTx, cancelledTx,
    activeUsers, totalUsers,
    resolvedReports, dismissedReports, totalReports, fraudReports,
    healthyListings, totalListings,
    avgTrustAgg,
  ] = await Promise.all([
    Listing.countDocuments({ 'transaction.completedAt': { $ne: null } }),
    Listing.countDocuments({ 'transaction.cancelled': true }),
    User.countDocuments({ role: { $ne: 'admin' }, updatedAt: { $gte: since30 } }),
    User.countDocuments({ role: { $ne: 'admin' } }),
    Report.countDocuments({ status: 'resolved' }),
    Report.countDocuments({ status: 'dismissed' }),
    Report.countDocuments(),
    Report.countDocuments({ reason: { $in: FRAUD_REASONS } }),
    Listing.countDocuments({ isHidden: { $ne: true }, status: { $ne: 'removed' } }),
    Listing.countDocuments(),
    User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $group: { _id: null, avg: { $avg: '$trustScore' } } },
    ]),
  ])

  const txSuccessRate    = pct(successfulTx, successfulTx + cancelledTx) || 100
  const activeUserRate   = pct(activeUsers, totalUsers)
  const resolutionRate   = pct(resolvedReports + dismissedReports, totalReports) || 100
  const scamRatio        = pct(fraudReports, totalReports)
  const listingQuality   = pct(healthyListings, totalListings) || 100
  const trustDistribution = round(avgTrustAgg[0]?.avg || 0)

  // Equal-weighted average of six 0–100 factors (scam ratio inverted — lower is better).
  const score = round(
    (txSuccessRate + activeUserRate + resolutionRate + (100 - scamRatio) + listingQuality + trustDistribution) / 6
  )

  const reasons = []
  if (txSuccessRate >= 80) reasons.push(`High transaction success (${txSuccessRate}%)`)
  else if (txSuccessRate < 50 && (successfulTx + cancelledTx) > 0) reasons.push(`Low transaction success (${txSuccessRate}%)`)

  if (totalReports === 0) reasons.push('No reports filed yet')
  else if (scamRatio <= 5) reasons.push(`Low scam reports (${scamRatio}%)`)
  else if (scamRatio >= 20) reasons.push(`Elevated scam reports (${scamRatio}%)`)

  if (trustDistribution >= 70) reasons.push(`Healthy trust distribution (avg ${trustDistribution}/100)`)
  else if (trustDistribution < 40 && totalUsers > 0) reasons.push(`Low average trust (avg ${trustDistribution}/100)`)

  if (resolutionRate >= 80 && totalReports > 0) reasons.push(`Strong report resolution rate (${resolutionRate}%)`)
  if (listingQuality >= 90) reasons.push(`Healthy listing quality (${listingQuality}% approved)`)

  return {
    score,
    label: healthLabel(score),
    factors: { txSuccessRate, activeUserRate, resolutionRate, scamRatio, listingQuality, trustDistribution },
    reasons: reasons.slice(0, 4),
  }
}

// ── Live Activity Feed ────────────────────────────────────────────────────────

async function getActivityFeed(limit = 20) {
  const perSource = Math.max(limit, 10)

  const [modLogs, reports, reviews, transactions, trustEvents] = await Promise.all([
    ModerationLog.find().sort({ createdAt: -1 }).limit(perSource)
      .populate('listing', 'title').populate('by', 'name').lean(),
    Report.find().sort({ createdAt: -1 }).limit(perSource)
      .select('reason reportType createdAt').lean(),
    Review.find().sort({ createdAt: -1 }).limit(perSource)
      .populate('reviewer', 'name').select('rating createdAt reviewer').lean(),
    Listing.find({ 'transaction.completedAt': { $ne: null } })
      .sort({ 'transaction.completedAt': -1 }).limit(perSource)
      .select('title transaction.completedAt').lean(),
    User.aggregate([
      { $unwind: '$trustHistory' },
      { $sort: { 'trustHistory.createdAt': -1 } },
      { $limit: perSource },
      { $project: { name: 1, description: '$trustHistory.description', type: '$trustHistory.type', createdAt: '$trustHistory.createdAt' } },
    ]),
  ])

  const MOD_LABELS = {
    created: 'Listing created', reported: 'Listing reported', hidden: 'Listing marked under review',
    unhidden: 'Listing approved', removed: 'Listing removed', restored: 'Listing restored',
    featured: 'Listing featured', unfeatured: 'Listing unfeatured',
  }

  const events = [
    ...modLogs.map((m) => ({
      type: 'moderation',
      message: `${MOD_LABELS[m.action] || m.action}: "${m.listing?.title || 'Unknown listing'}"`,
      createdAt: m.createdAt,
    })),
    ...reports.map((r) => ({
      type: 'report',
      message: `New ${r.reportType} report filed (${r.reason.replace(/_/g, ' ')})`,
      createdAt: r.createdAt,
    })),
    ...reviews.map((r) => ({
      type: 'review',
      message: `${r.reviewer?.name || 'A user'} submitted a ${r.rating}★ review`,
      createdAt: r.createdAt,
    })),
    ...transactions.map((t) => ({
      type: 'transaction',
      message: `Transaction completed for "${t.title}"`,
      createdAt: t.transaction.completedAt,
    })),
    ...trustEvents.map((t) => ({
      type: 'trust',
      message: `${t.name || 'A user'}: ${t.description}`,
      createdAt: t.createdAt,
    })),
  ]

  return events
    .filter((e) => e.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}

// ── Top Insights ───────────────────────────────────────────────────────────
// Simple, honestly-calculated observations — no AI, no fabricated numbers.
// Each insight is only included when the underlying data actually supports it.

async function getInsights() {
  const now = new Date()
  const weekAgo = daysAgo(7, now)
  const twoWeeksAgo = daysAgo(14, now)
  const monthAgo = daysAgo(30, now)

  const insights = []

  const [
    listingsThisWeek, listingsLastWeek,
    fraudThisWeek, fraudLastWeek,
    trustDeltaThisWeek,
    categoryCounts, categoryReports,
    stateCounts,
  ] = await Promise.all([
    Listing.countDocuments({ createdAt: { $gte: weekAgo } }),
    Listing.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
    Report.countDocuments({ reason: { $in: FRAUD_REASONS }, createdAt: { $gte: weekAgo } }),
    Report.countDocuments({ reason: { $in: FRAUD_REASONS }, createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
    User.aggregate([
      { $unwind: '$trustHistory' },
      { $match: { 'trustHistory.createdAt': { $gte: weekAgo } } },
      { $group: { _id: null, net: { $sum: '$trustHistory.delta' } } },
    ]),
    Listing.aggregate([
      { $match: { status: { $ne: 'removed' } } },
      { $group: { _id: '$category.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    Listing.aggregate([
      { $match: { status: { $ne: 'removed' } } },
      { $group: { _id: '$category.name', listings: { $sum: 1 }, reports: { $sum: '$reportsCount' } } },
      { $match: { listings: { $gte: 1 } } },
      { $project: { rate: { $divide: ['$reports', '$listings'] } } },
      { $sort: { rate: -1 } },
      { $limit: 1 },
    ]),
    Listing.aggregate([
      { $match: { 'transaction.completedAt': { $gte: monthAgo } } },
      { $group: { _id: '$location.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
  ])

  if (categoryCounts[0]?._id) {
    insights.push(`${categoryCounts[0]._id} is the most active category (${categoryCounts[0].count} listings).`)
  }

  if (listingsLastWeek > 0) {
    const change = round(((listingsThisWeek - listingsLastWeek) / listingsLastWeek) * 100)
    if (change !== 0) {
      insights.push(`Listings ${change > 0 ? 'increased' : 'decreased'} ${Math.abs(change)}% this week.`)
    }
  } else if (listingsThisWeek > 0) {
    insights.push(`${listingsThisWeek} new listings were posted this week.`)
  }

  if (fraudLastWeek > 0 || fraudThisWeek > 0) {
    if (fraudThisWeek < fraudLastWeek) insights.push('Fraud reports decreased compared to last week.')
    else if (fraudThisWeek > fraudLastWeek) insights.push('Fraud reports increased compared to last week — worth a closer look.')
    else insights.push('Fraud reports are steady compared to last week.')
  }

  const netDelta = trustDeltaThisWeek[0]?.net || 0
  if (netDelta > 0) insights.push('Average marketplace trust is trending up this week.')
  else if (netDelta < 0) insights.push('Average marketplace trust is trending down this week.')

  if (categoryReports[0]?._id) {
    insights.push(`${categoryReports[0]._id} has the highest report rate among active categories.`)
  }

  if (stateCounts[0]?._id) {
    insights.push(`${stateCounts[0]._id} is the top-performing state this month (${stateCounts[0].count} completed deals).`)
  }

  return insights
}

module.exports = {
  getOverview,
  getMarketplaceHealth,
  getActivityFeed,
  getInsights,
}
