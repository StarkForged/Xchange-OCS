const mongoose = require('mongoose')
const Report   = require('../Models/Report')
const User     = require('../Models/User')
const ApiError = require('../Utils/ApiError')
const {
  emitReportUnderReview,
  emitMoreEvidenceRequested,
  emitReportResolved,
  emitReportDismissed,
} = require('../Utils/reportEvents')

const OPEN_STATUSES = ['submitted', 'in_review', 'waiting_for_evidence']

const REPORTER_FIELDS = 'name email profileImage trustScore'
const REPORTED_USER_FIELDS = 'name email profileImage trustScore accountStatus isVerifiedSeller reportedStats'

// Decrements pendingReports (floor 0) and applies the valid/false-report
// counters — shared by resolve/dismiss so the bookkeeping only lives once.
async function applyOutcomeStats(report, { falseReport = false, credit = false } = {}) {
  const reporterInc = { 'reporterStats.pendingReports': -1 }
  if (credit) reporterInc['reporterStats.validReports'] = 1
  if (falseReport) reporterInc['reporterStats.falseReports'] = 1
  await User.updateOne({ _id: report.reporter }, { $inc: reporterInc })

  if (report.reportedUser) {
    const targetInc = credit
      ? { 'reportedStats.validReports': 1, 'reportedStats.resolvedReports': 1 }
      : { 'reportedStats.dismissedReports': 1 }
    await User.updateOne({ _id: report.reportedUser }, { $inc: targetInc })
  }
}

// ── GET /api/admin/reports ────────────────────────────────────────────────────

exports.getAdminReports = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      reportType = '',
      status = '',
      priority = '',
      reason = '',
      search = '',
    } = req.query

    const query = {}
    if (reportType) query.reportType = reportType
    if (status)     query.status = status
    if (priority)   query.priority = priority
    if (reason)     query.reason = reason

    if (search.trim()) {
      const term = search.trim()
      const regex = new RegExp(term, 'i')
      const orClauses = [{ referenceNumber: regex }]
      if (mongoose.Types.ObjectId.isValid(term)) {
        orClauses.push({ _id: term }, { listing: term }, { reportedUser: term })
      }
      const matchingUsers = await User.find({ name: regex }).select('_id').lean()
      if (matchingUsers.length > 0) {
        const ids = matchingUsers.map((u) => u._id)
        orClauses.push({ reporter: { $in: ids } }, { reportedUser: { $in: ids } })
      }
      query.$or = orClauses
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [reports, total, summary] = await Promise.all([
      Report.find(query)
        .select('-adminNotes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('listing', 'title images')
        .populate('reportedUser', 'name profileImage trustScore')
        .populate('reporter', 'name email')
        .lean(),
      Report.countDocuments(query),
      Promise.all([
        Report.countDocuments({ status: 'submitted' }),
        Report.countDocuments({ status: 'in_review' }),
        Report.countDocuments({ status: 'waiting_for_evidence' }),
        Report.countDocuments({ status: 'resolved' }),
        Report.countDocuments({ status: 'dismissed' }),
        Report.countDocuments({ priority: 'critical', status: { $in: OPEN_STATUSES } }),
      ]).then(([submitted, inReview, waitingForEvidence, resolved, dismissed, criticalOpen]) => ({
        submitted, inReview, waitingForEvidence, resolved, dismissed, criticalOpen,
        total: submitted + inReview + waitingForEvidence + resolved + dismissed,
      })),
    ])

    res.json({
      reports,
      summary,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/reports/:id ────────────────────────────────────────────────
// Full detail: evidence, timeline, admin notes, reporter history, reported
// user's trust score + prior reports, and similar reports on the same target.

exports.getAdminReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter', REPORTER_FIELDS)
      .populate('reportedUser', REPORTED_USER_FIELDS)
      .populate('listing', 'title images seller status')
      .populate('resolvedBy', 'name email')
      .populate('adminNotes.addedBy', 'name email')
      .populate('timeline.by', 'name role')
      .populate('duplicateOf', 'referenceNumber status')
      .lean()

    if (!report) throw new ApiError(404, 'Report not found')

    const targetFilter = report.reportType === 'listing'
      ? { reportType: 'listing', listing: report.listing?._id }
      : { reportType: 'user', reportedUser: report.reportedUser?._id }

    const [reporterHistory, priorReportsOnTarget, similarReports] = await Promise.all([
      User.findById(report.reporter?._id).select('reporterStats').lean(),
      Report.find({ ...targetFilter, _id: { $ne: report._id } })
        .select('referenceNumber status priority reason createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Report.find({ ...targetFilter, reason: report.reason, _id: { $ne: report._id } })
        .select('referenceNumber status createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ])

    res.json({
      report,
      reporterHistory: reporterHistory?.reporterStats || null,
      priorReportsOnTarget,
      similarReports,
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/reports/:id/review ───────────────────────────────────────

exports.markUnderReview = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
    if (!report) throw new ApiError(404, 'Report not found')
    if (!OPEN_STATUSES.includes(report.status)) throw new ApiError(400, 'Report is already closed')

    const wasSubmitted = report.status === 'submitted'
    report.status = 'in_review'
    if (wasSubmitted) report.timeline.push({ action: 'viewed', by: req.user._id, at: new Date() })
    report.timeline.push({ action: 'under_review', by: req.user._id, at: new Date() })
    await report.save()

    emitReportUnderReview({ reportId: report._id, referenceNumber: report.referenceNumber })

    res.json({ message: 'Report marked as under review', report })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/reports/:id/request-evidence ─────────────────────────────

exports.requestMoreEvidence = async (req, res, next) => {
  try {
    const { note = '' } = req.body
    const report = await Report.findById(req.params.id)
    if (!report) throw new ApiError(404, 'Report not found')
    if (!OPEN_STATUSES.includes(report.status)) throw new ApiError(400, 'Report is already closed')

    report.status = 'waiting_for_evidence'
    report.timeline.push({ action: 'evidence_requested', by: req.user._id, note: note.trim(), at: new Date() })
    await report.save()

    emitMoreEvidenceRequested({ reportId: report._id, referenceNumber: report.referenceNumber, note })

    res.json({ message: 'Requested more evidence from the reporter', report })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/reports/:id/resolve ──────────────────────────────────────

exports.resolveReport = async (req, res, next) => {
  try {
    const { resolution = '', falseReport = false } = req.body
    if (!resolution.trim()) throw new ApiError(400, 'A resolution summary is required')

    const report = await Report.findById(req.params.id)
    if (!report) throw new ApiError(404, 'Report not found')
    if (['resolved', 'dismissed'].includes(report.status)) throw new ApiError(400, 'Report is already closed')

    report.status = 'resolved'
    report.resolution = resolution.trim()
    report.resolvedBy = req.user._id
    report.resolvedAt = new Date()
    report.falseReport = !!falseReport
    report.timeline.push({ action: 'action_taken', by: req.user._id, note: resolution.trim(), at: new Date() })
    report.timeline.push({ action: 'closed', by: req.user._id, at: new Date() })
    await report.save()

    await applyOutcomeStats(report, { falseReport: !!falseReport, credit: !falseReport })

    emitReportResolved({ reportId: report._id, referenceNumber: report.referenceNumber, falseReport: !!falseReport })

    res.json({ message: 'Report resolved', report })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/reports/:id/dismiss ──────────────────────────────────────

exports.dismissReport = async (req, res, next) => {
  try {
    const { resolution = '' } = req.body
    const report = await Report.findById(req.params.id)
    if (!report) throw new ApiError(404, 'Report not found')
    if (['resolved', 'dismissed'].includes(report.status)) throw new ApiError(400, 'Report is already closed')

    report.status = 'dismissed'
    report.resolution = resolution.trim()
    report.resolvedBy = req.user._id
    report.resolvedAt = new Date()
    report.timeline.push({ action: 'closed', by: req.user._id, note: resolution.trim() || 'Dismissed', at: new Date() })
    await report.save()

    await applyOutcomeStats(report, { falseReport: false, credit: false })

    emitReportDismissed({ reportId: report._id, referenceNumber: report.referenceNumber })

    res.json({ message: 'Report dismissed', report })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/reports/:id/duplicate ────────────────────────────────────

exports.markAsDuplicate = async (req, res, next) => {
  try {
    const { duplicateOfId } = req.body
    if (!duplicateOfId || !mongoose.Types.ObjectId.isValid(duplicateOfId)) {
      throw new ApiError(400, 'A valid duplicateOfId is required')
    }
    const original = await Report.findById(duplicateOfId).select('referenceNumber').lean()
    if (!original) throw new ApiError(404, 'Original report not found')

    const report = await Report.findById(req.params.id)
    if (!report) throw new ApiError(404, 'Report not found')
    if (['resolved', 'dismissed'].includes(report.status)) throw new ApiError(400, 'Report is already closed')

    report.duplicateOf = original._id
    report.status = 'dismissed'
    report.resolution = `Duplicate of ${original.referenceNumber}`
    report.resolvedBy = req.user._id
    report.resolvedAt = new Date()
    report.timeline.push({ action: 'closed', by: req.user._id, note: `Marked as duplicate of ${original.referenceNumber}`, at: new Date() })
    await report.save()

    await applyOutcomeStats(report, { falseReport: false, credit: false })

    emitReportDismissed({ reportId: report._id, referenceNumber: report.referenceNumber, duplicateOf: original.referenceNumber })

    res.json({ message: 'Report marked as duplicate', report })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/admin/reports/:id/notes ─────────────────────────────────────────
// Internal-only — never surfaced to the reporter or the reported user/seller.

exports.addAdminNote = async (req, res, next) => {
  try {
    const { text } = req.body
    if (!text?.trim()) throw new ApiError(400, 'Note text is required')

    const report = await Report.findById(req.params.id)
    if (!report) throw new ApiError(404, 'Report not found')

    report.adminNotes.push({ text: text.trim(), addedBy: req.user._id, addedAt: new Date() })
    await report.save()

    const populated = await Report.findById(report._id)
      .select('adminNotes')
      .populate('adminNotes.addedBy', 'name email')
      .lean()

    res.status(201).json({ adminNotes: populated.adminNotes })
  } catch (err) {
    next(err)
  }
}

// ── Shared helper for other admin controllers ─────────────────────────────────
// Called when a listing is hidden/removed for cause — auto-resolves any open
// reports against it instead of leaving them stuck open forever.

exports.autoResolveOpenReportsForListing = async (listingId, adminId, resolutionText) => {
  const openReports = await Report.find({
    reportType: 'listing',
    listing: listingId,
    status: { $in: OPEN_STATUSES },
  })

  for (const report of openReports) {
    report.status = 'resolved'
    report.resolution = resolutionText
    report.resolvedBy = adminId
    report.resolvedAt = new Date()
    report.falseReport = false
    report.timeline.push({ action: 'action_taken', by: adminId, note: resolutionText, at: new Date() })
    report.timeline.push({ action: 'closed', by: adminId, at: new Date() })
    await report.save()
    await applyOutcomeStats(report, { falseReport: false, credit: true })
    emitReportResolved({ reportId: report._id, referenceNumber: report.referenceNumber, falseReport: false })
  }
}
