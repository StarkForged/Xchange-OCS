/**
 * Thin controller layer for the Admin Analytics Dashboard (Phase 12E) — every
 * calculation lives in analytics.service.js / dashboard.service.js; this file
 * only wires HTTP requests to those services and shapes CSV export downloads.
 */

const User    = require('../Models/User')
const Listing = require('../Models/Listing')
const Review  = require('../Models/Review')
const Report  = require('../Models/Report')
const ApiError = require('../Utils/ApiError')
const { toCSV } = require('../Utils/csv')

const analytics = require('../Services/analytics.service')
const dashboard = require('../Services/dashboard.service')

// ── GET /api/admin/analytics/overview ────────────────────────────────────────
exports.getOverview = async (req, res, next) => {
  try {
    res.json(await dashboard.getOverview())
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/users ───────────────────────────────────────────
exports.getUserAnalytics = async (req, res, next) => {
  try {
    res.json(await analytics.getUserAnalytics())
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/listings ────────────────────────────────────────
exports.getListingAnalytics = async (req, res, next) => {
  try {
    res.json(await analytics.getListingAnalytics())
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/transactions ────────────────────────────────────
exports.getTransactionAnalytics = async (req, res, next) => {
  try {
    res.json(await analytics.getTransactionAnalytics())
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/reviews ─────────────────────────────────────────
exports.getReviewAnalytics = async (req, res, next) => {
  try {
    res.json(await analytics.getReviewAnalytics())
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/reports ─────────────────────────────────────────
exports.getReportAnalytics = async (req, res, next) => {
  try {
    res.json(await analytics.getReportAnalytics())
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/trust ───────────────────────────────────────────
exports.getTrustAnalytics = async (req, res, next) => {
  try {
    res.json(await analytics.getTrustAnalytics())
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/health ──────────────────────────────────────────
exports.getHealth = async (req, res, next) => {
  try {
    res.json(await dashboard.getMarketplaceHealth())
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/activity ────────────────────────────────────────
exports.getActivityFeed = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    res.json({ events: await dashboard.getActivityFeed(limit) })
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/insights ────────────────────────────────────────
exports.getInsights = async (req, res, next) => {
  try {
    res.json({ insights: await dashboard.getInsights() })
  } catch (err) { next(err) }
}

// ── GET /api/admin/analytics/export/:type ────────────────────────────────────
// type: users | listings | reports | reviews | transactions — CSV only for
// now; kept as a distinct row-building step per type so a PDF renderer can
// reuse the same `rows`/`columns` shape later without touching this switch.

const EXPORT_ROW_LIMIT = 5000

async function buildUsersExport() {
  const rows = await User.find({ role: { $ne: 'admin' } })
    .select('name email role accountStatus isVerifiedSeller trustScore trust.tier createdAt')
    .sort({ createdAt: -1 }).limit(EXPORT_ROW_LIMIT).lean()
  const columns = [
    { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' }, { key: 'accountStatus', label: 'Status' },
    { key: 'isVerifiedSeller', label: 'Verified Seller' }, { key: 'trustScore', label: 'Trust Score' },
    { key: 'trust.tier', label: 'Trust Tier' }, { key: 'createdAt', label: 'Joined' },
  ]
  return { rows, columns }
}

async function buildListingsExport() {
  const rows = await Listing.find()
    .select('title category.name price.amount status isHidden reportsCount viewsCount createdAt')
    .sort({ createdAt: -1 }).limit(EXPORT_ROW_LIMIT).lean()
  const columns = [
    { key: 'title', label: 'Title' }, { key: 'category.name', label: 'Category' },
    { key: 'price.amount', label: 'Price' }, { key: 'status', label: 'Status' },
    { key: 'isHidden', label: 'Under Review' }, { key: 'reportsCount', label: 'Reports' },
    { key: 'viewsCount', label: 'Views' }, { key: 'createdAt', label: 'Created' },
  ]
  return { rows, columns }
}

async function buildReportsExport() {
  const rows = await Report.find()
    .select('referenceNumber reportType reason priority status createdAt resolvedAt')
    .sort({ createdAt: -1 }).limit(EXPORT_ROW_LIMIT).lean()
  const columns = [
    { key: 'referenceNumber', label: 'Reference' }, { key: 'reportType', label: 'Type' },
    { key: 'reason', label: 'Reason' }, { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Filed' },
    { key: 'resolvedAt', label: 'Resolved' },
  ]
  return { rows, columns }
}

async function buildReviewsExport() {
  const rows = await Review.find()
    .populate('reviewer', 'name').populate('reviewee', 'name')
    .select('rating comment role createdAt reviewer reviewee')
    .sort({ createdAt: -1 }).limit(EXPORT_ROW_LIMIT).lean()
  const shaped = rows.map((r) => ({
    reviewer: r.reviewer?.name || '—', reviewee: r.reviewee?.name || '—',
    rating: r.rating, role: r.role, comment: r.comment, createdAt: r.createdAt,
  }))
  const columns = [
    { key: 'reviewer', label: 'Reviewer' }, { key: 'reviewee', label: 'Reviewee' },
    { key: 'rating', label: 'Rating' }, { key: 'role', label: 'Reviewer Role' },
    { key: 'comment', label: 'Comment' }, { key: 'createdAt', label: 'Submitted' },
  ]
  return { rows: shaped, columns }
}

async function buildTransactionsExport() {
  const rows = await Listing.find({ 'transaction.completedAt': { $ne: null } })
    .select('title price.amount transaction.completedAt transaction.cancelled transaction.buyer seller')
    .sort({ 'transaction.completedAt': -1 }).limit(EXPORT_ROW_LIMIT).lean()
  const columns = [
    { key: 'title', label: 'Listing' }, { key: 'price.amount', label: 'Price' },
    { key: 'transaction.completedAt', label: 'Completed At' },
    { key: 'transaction.cancelled', label: 'Cancelled' },
  ]
  return { rows, columns }
}

const EXPORT_BUILDERS = {
  users: buildUsersExport,
  listings: buildListingsExport,
  reports: buildReportsExport,
  reviews: buildReviewsExport,
  transactions: buildTransactionsExport,
}

exports.exportData = async (req, res, next) => {
  try {
    const { type } = req.params
    const builder = EXPORT_BUILDERS[type]
    if (!builder) throw new ApiError(400, `Unknown export type "${type}". Must be one of: ${Object.keys(EXPORT_BUILDERS).join(', ')}`)

    const { rows, columns } = await builder()
    const csv = toCSV(rows, columns)

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send(csv)
  } catch (err) { next(err) }
}
