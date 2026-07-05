const mongoose       = require('mongoose')
const Listing        = require('../Models/Listing')
const User           = require('../Models/User')
const Chat           = require('../Models/Chat')
const Review         = require('../Models/Review')
const Report         = require('../Models/Report')
const ModerationLog  = require('../Models/ModerationLog')
const ApiError       = require('../Utils/ApiError')

// Dedicated admin-only listing moderation endpoints. Deliberately not shared
// with the seller-facing listing.controller.js — different auth model
// (requireAdmin), different response shape, and different side effects
// (moderation trail, marketplace visibility).

const HIDE_REASON_LABELS = {
  spam:          'Spam',
  duplicate:     'Duplicate Listing',
  fraudulent:    'Fraudulent Listing',
  inappropriate: 'Inappropriate Content',
  misleading:    'Misleading Information',
  counterfeit:   'Counterfeit Item',
  other:         'Other',
}

const SELLER_FIELDS = 'name email profileImage trustScore isVerifiedSeller badges accountStatus'

// 1 report → Low, 3 → Medium, 5 → High, 10+ → Critical
function reportPriority(count = 0) {
  if (count >= 10) return 'critical'
  if (count >= 5)  return 'high'
  if (count >= 3)  return 'medium'
  if (count >= 1)  return 'low'
  return 'none'
}

const logEvent = (listing, action, by, reason = '') =>
  ModerationLog.create({ listing, action, by, reason }).catch(() => {})

// ── GET /api/admin/listings ───────────────────────────────────────────────────

exports.getAdminListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      category = '',
      minPrice = '',
      maxPrice = '',
      reportedOnly = '',
      verifiedOnly = '',
      sortBy = 'newest',
    } = req.query

    // Removed listings are soft-deleted and excluded from the default view —
    // an admin has to explicitly filter for status=removed to restore one.
    const query = { status: { $ne: 'removed' } }

    if (status === 'hidden') {
      query.isHidden = true
    } else if (status === 'removed') {
      query.status = 'removed'
    } else if (['active', 'paused', 'sold'].includes(status)) {
      query.status = status
    }

    if (category) query['category.id'] = category

    const priceFilter = {}
    if (minPrice !== '' && !isNaN(Number(minPrice))) priceFilter.$gte = Number(minPrice)
    if (maxPrice !== '' && !isNaN(Number(maxPrice))) priceFilter.$lte = Number(maxPrice)
    if (Object.keys(priceFilter).length) query['price.amount'] = priceFilter

    if (reportedOnly === 'true') query.reportsCount = { $gt: 0 }

    // Search spans title, listing ID, and seller name — the latter two need a
    // seller-id lookup since Mongo can't regex across a ref in one query.
    let sellerIdFilter = null
    if (verifiedOnly === 'true') {
      const verifiedSellers = await User.find({ isVerifiedSeller: true }).select('_id').lean()
      sellerIdFilter = new Set(verifiedSellers.map((s) => String(s._id)))
    }

    if (search.trim()) {
      const term  = search.trim()
      const regex = new RegExp(term, 'i')
      const orClauses = [{ title: regex }]
      if (mongoose.Types.ObjectId.isValid(term)) orClauses.push({ _id: term })

      const matchingSellers = await User.find({ name: regex }).select('_id').lean()
      if (matchingSellers.length > 0) {
        orClauses.push({ seller: { $in: matchingSellers.map((s) => s._id) } })
      }
      query.$or = orClauses
    }

    if (sellerIdFilter) {
      // Intersect with any seller ids already implied by $or search clauses
      query.seller = { $in: [...sellerIdFilter] }
    }

    let sort = { createdAt: -1 }
    if (sortBy === 'oldest')      sort = { createdAt: 1 }
    if (sortBy === 'mostViewed')  sort = { viewsCount: -1 }

    const skip = (Number(page) - 1) * Number(limit)

    const [listings, total, summary] = await Promise.all([
      Listing.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('seller', SELLER_FIELDS)
        .lean(),
      Listing.countDocuments(query),
      Promise.all([
        Listing.countDocuments({ status: { $ne: 'removed' } }),
        Listing.countDocuments({ status: 'active' }),
        Listing.countDocuments({ status: 'paused' }),
        Listing.countDocuments({ status: 'sold' }),
        Listing.countDocuments({ isHidden: true, status: { $ne: 'removed' } }),
        Listing.countDocuments({ reportsCount: { $gt: 0 }, status: { $ne: 'removed' } }),
      ]).then(([totalCount, active, paused, sold, hidden, reported]) => ({
        total: totalCount, active, paused, sold, hidden, reported,
      })),
    ])

    res.json({
      listings: listings.map((l) => ({ ...l, reportPriority: reportPriority(l.reportsCount) })),
      summary,
      pagination: {
        page:  Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/listings/:id ───────────────────────────────────────────────

exports.getAdminListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', SELLER_FIELDS)
      .populate('transaction.buyer', 'name profileImage email')
      .populate('hiddenBy', 'name email')
      .populate('removedBy', 'name email')
      .populate('featuredBy', 'name email')
      .populate('adminNotes.addedBy', 'name email')
      .lean()

    if (!listing) throw new ApiError(404, 'Listing not found')

    const [savesCount, chatsCount, reports, reviewCount, timeline] = await Promise.all([
      User.countDocuments({ savedListings: listing._id }),
      Chat.countDocuments({ listing: listing._id }),
      Report.find({ listing: listing._id })
        .populate('reporter', 'name email profileImage')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .lean(),
      Review.countDocuments({ listing: listing._id }),
      ModerationLog.find({ listing: listing._id })
        .populate('by', 'name role')
        .sort({ createdAt: -1 })
        .lean(),
    ])

    res.json({
      listing: {
        ...listing,
        stats: {
          views:  listing.viewsCount ?? 0,
          saves:  savesCount,
          chats:  chatsCount,
          reports: reports.length,
        },
        reviewStatus: {
          reviewCount,
          reviewsUnlocked: !!listing.transaction?.completedAt,
        },
        reportPriority: reportPriority(listing.reportsCount),
      },
      reports,
      timeline,
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/listings/:id/reports ───────────────────────────────────────

exports.getListingReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ listing: req.params.id })
      .populate('reporter', 'name email profileImage')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ reports })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/reports/:reportId/dismiss ───────────────────────────────

exports.dismissReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.reportId)
    if (!report) throw new ApiError(404, 'Report not found')

    report.status     = 'dismissed'
    report.resolvedBy  = req.user._id
    report.resolvedAt  = new Date()
    await report.save()

    res.json({ message: 'Report dismissed', report })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/listings/:id/hide ────────────────────────────────────────

exports.hideListing = async (req, res, next) => {
  try {
    const { reason, note = '' } = req.body
    if (!HIDE_REASON_LABELS[reason]) {
      throw new ApiError(400, `reason must be one of: ${Object.keys(HIDE_REASON_LABELS).join(', ')}`)
    }
    if (reason === 'other' && !note.trim()) {
      throw new ApiError(400, 'A text explanation is required when reason is "other"')
    }

    const listing = await Listing.findById(req.params.id)
    if (!listing) throw new ApiError(404, 'Listing not found')

    listing.isHidden     = true
    listing.hiddenBy     = req.user._id
    listing.hiddenReason = note.trim()
      ? `${HIDE_REASON_LABELS[reason]}: ${note.trim()}`
      : HIDE_REASON_LABELS[reason]
    listing.hiddenAt     = new Date()

    // If this hide resolves an open report investigation, mark pending
    // reports on this listing as actioned.
    await Report.updateMany(
      { listing: listing._id, status: 'pending' },
      { $set: { status: 'actioned', resolvedBy: req.user._id, resolvedAt: new Date() } }
    )

    await listing.save()
    await logEvent(listing._id, 'hidden', req.user._id, listing.hiddenReason)

    res.json({ message: 'Listing hidden', listing })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/listings/:id/unhide ──────────────────────────────────────

exports.unhideListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
    if (!listing) throw new ApiError(404, 'Listing not found')

    listing.isHidden     = false
    listing.hiddenBy     = null
    listing.hiddenReason = ''
    listing.hiddenAt     = null
    await listing.save()
    await logEvent(listing._id, 'unhidden', req.user._id)

    res.json({ message: 'Listing unhidden', listing })
  } catch (err) {
    next(err)
  }
}

// ── DELETE /api/admin/listings/:id ────────────────────────────────────────────
// Soft delete: status -> 'removed'. Document is kept for audit and can be
// restored later. Requires typed confirmation.

exports.removeListing = async (req, res, next) => {
  try {
    const { confirm, reason = '' } = req.body
    if (confirm !== 'DELETE') {
      throw new ApiError(400, 'Type DELETE to confirm removal')
    }

    const listing = await Listing.findById(req.params.id)
    if (!listing) throw new ApiError(404, 'Listing not found')

    listing.preRemovalStatus = listing.status
    listing.status        = 'removed'
    listing.removedBy     = req.user._id
    listing.removedReason = reason.trim()
    listing.removedAt     = new Date()

    // Removing the listing resolves any open report investigation.
    await Report.updateMany(
      { listing: listing._id, status: 'pending' },
      { $set: { status: 'actioned', resolvedBy: req.user._id, resolvedAt: new Date() } }
    )

    await listing.save()
    await logEvent(listing._id, 'removed', req.user._id, listing.removedReason)

    res.json({ message: 'Listing removed', listing })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/listings/:id/restore ─────────────────────────────────────
// Undoes a removal. Restores to whatever status the listing had before being
// removed (defaulting to 'active' for older records) — the isHidden flag is
// untouched by removal, so a listing that was Hidden before it was Removed
// comes back Hidden; otherwise it comes back Active.

exports.restoreListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
    if (!listing) throw new ApiError(404, 'Listing not found')
    if (listing.status !== 'removed') throw new ApiError(400, 'Listing is not removed')

    listing.status           = listing.preRemovalStatus || 'active'
    listing.preRemovalStatus = null
    listing.removedBy        = null
    listing.removedReason    = ''
    listing.removedAt        = null
    await listing.save()
    await logEvent(listing._id, 'restored', req.user._id)

    res.json({ message: 'Listing restored', listing })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/listings/:id/feature ─────────────────────────────────────

exports.featureListing = async (req, res, next) => {
  try {
    const { featured, featuredUntil = null, reason = '' } = req.body
    if (typeof featured !== 'boolean') throw new ApiError(400, 'featured must be a boolean')

    const listing = await Listing.findById(req.params.id)
    if (!listing) throw new ApiError(404, 'Listing not found')

    listing.featured       = featured
    listing.featuredUntil  = featured ? (featuredUntil ? new Date(featuredUntil) : null) : null
    listing.featuredBy     = featured ? req.user._id : null
    listing.featuredReason = featured ? reason.trim() : ''
    listing.featuredAt     = featured ? new Date() : null
    await listing.save()
    await logEvent(listing._id, featured ? 'featured' : 'unfeatured', req.user._id, listing.featuredReason)

    res.json({ message: featured ? 'Listing featured' : 'Listing unfeatured', listing })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/admin/listings/:id/notes ────────────────────────────────────────
// Internal-only — never surfaced to buyers/sellers.

exports.addAdminNote = async (req, res, next) => {
  try {
    const { text } = req.body
    if (!text?.trim()) throw new ApiError(400, 'Note text is required')

    const listing = await Listing.findById(req.params.id)
    if (!listing) throw new ApiError(404, 'Listing not found')

    listing.adminNotes.push({ text: text.trim(), addedBy: req.user._id, addedAt: new Date() })
    await listing.save()

    const populated = await Listing.findById(listing._id)
      .select('adminNotes')
      .populate('adminNotes.addedBy', 'name email')
      .lean()

    res.status(201).json({ adminNotes: populated.adminNotes })
  } catch (err) {
    next(err)
  }
}
