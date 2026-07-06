const streamifier = require('streamifier')
const mongoose    = require('mongoose')
const Report      = require('../Models/Report')
const Listing     = require('../Models/Listing')
const User        = require('../Models/User')
const ModerationLog = require('../Models/ModerationLog')
const ApiError    = require('../Utils/ApiError')
const cloudinary  = require('../Config/cloudinary')
const { computeReportPriority } = require('../Utils/reportPriority')
const { generateReferenceNumber } = require('../Utils/referenceNumber')
const { emitReportSubmitted } = require('../Utils/reportEvents')

// Statuses that still count as "open" — a reporter can't file a second
// report against the same target while one of these is in flight.
const OPEN_STATUSES = ['submitted', 'in_review', 'waiting_for_evidence']

const uploadEvidence = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'xchange/reports', resource_type: 'auto' },
      (err, result) => (err ? reject(err) : resolve({
        url: result.secure_url,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      }))
    )
    streamifier.createReadStream(file.buffer).pipe(stream)
  })

// Builds the { reportType-appropriate target } query fragment used both for
// duplicate detection and for counting existing reports against a target.
function targetQuery(reportType, listingId, reportedUserId) {
  return reportType === 'listing'
    ? { reportType: 'listing', listing: listingId }
    : { reportType: 'user', reportedUser: reportedUserId }
}

// ── POST /api/reports  (protected, multipart) ─────────────────────────────────

exports.createReport = async (req, res, next) => {
  try {
    const { reportType, listingId, reportedUserId, reason, description, declaration } = req.body

    if (!['listing', 'user'].includes(reportType)) {
      throw new ApiError(400, 'reportType must be "listing" or "user"')
    }
    if (declaration !== 'true' && declaration !== true) {
      throw new ApiError(400, 'You must confirm the declaration before submitting')
    }
    if (!description?.trim() || description.trim().length < 30 || description.trim().length > 1000) {
      throw new ApiError(400, 'Description must be between 30 and 1000 characters')
    }
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'At least one piece of evidence is required')
    }
    if (req.files.length > 5) {
      throw new ApiError(400, 'A maximum of 5 files may be uploaded')
    }

    let listing = null
    let reportedUser = null

    if (reportType === 'listing') {
      if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) throw new ApiError(400, 'Invalid listingId')
      if (!Report.LISTING_REASONS.includes(reason)) {
        throw new ApiError(400, `reason must be one of: ${Report.LISTING_REASONS.join(', ')}`)
      }
      listing = await Listing.findById(listingId).lean()
      if (!listing) throw new ApiError(404, 'Listing not found')
      reportedUser = await User.findById(listing.seller).select('trustScore').lean()
    } else {
      if (!reportedUserId || !mongoose.Types.ObjectId.isValid(reportedUserId)) throw new ApiError(400, 'Invalid reportedUserId')
      if (!Report.USER_REASONS.includes(reason)) {
        throw new ApiError(400, `reason must be one of: ${Report.USER_REASONS.join(', ')}`)
      }
      if (String(reportedUserId) === String(req.user._id)) throw new ApiError(400, 'You cannot report yourself')
      reportedUser = await User.findById(reportedUserId).select('trustScore').lean()
      if (!reportedUser) throw new ApiError(404, 'User not found')
    }

    const targetFilter = targetQuery(reportType, listing?._id, reportedUser?._id)

    // Duplicate guard — one open report per (reporter, target).
    const existing = await Report.findOne({
      reporter: req.user._id,
      ...targetFilter,
      status: { $in: OPEN_STATUSES },
    }).lean()

    if (existing) {
      return res.status(409).json({
        message: 'You already reported this.',
        report: {
          _id: existing._id,
          referenceNumber: existing.referenceNumber,
          status: existing.status,
        },
      })
    }

    // Signals for automatic priority classification.
    const [targetOpenReportsCount, similarReportsCount, repeatOffenderCount] = await Promise.all([
      Report.countDocuments({ ...targetFilter, status: { $in: OPEN_STATUSES } }),
      Report.countDocuments({ ...targetFilter, reason }),
      Report.countDocuments({ ...targetFilter, status: 'resolved', falseReport: false }),
    ])

    const priority = computeReportPriority(reason, {
      targetOpenReportsCount,
      targetTrustScore: reportedUser?.trustScore ?? null,
      repeatOffenderCount,
      similarReportsCount,
    })

    const attachments = await Promise.all(req.files.map(uploadEvidence))
    const referenceNumber = await generateReferenceNumber()

    const report = await Report.create({
      reportType,
      listing: listing?._id ?? null,
      reportedUser: reportedUser?._id ?? null,
      reporter: req.user._id,
      reason,
      description: description.trim(),
      attachments,
      priority,
      referenceNumber,
      timeline: [{ action: 'submitted', by: req.user._id, at: new Date() }],
    })

    // Reporter + reported-user stats — data only, no trust-score math yet.
    await User.updateOne(
      { _id: req.user._id },
      { $inc: { 'reporterStats.totalReports': 1, 'reporterStats.pendingReports': 1 } }
    )
    if (reportedUser?._id) {
      await User.updateOne(
        { _id: reportedUser._id },
        { $inc: { 'reportedStats.reportsReceived': 1 } }
      )
    }

    // Preserve existing admin-listing-moderation surfaces (reports badge,
    // reported-priority filter, moderation timeline) for listing reports.
    if (reportType === 'listing') {
      await Listing.updateOne({ _id: listing._id }, { $inc: { reportsCount: 1 } })
      ModerationLog.create({ listing: listing._id, action: 'reported', by: req.user._id, reason }).catch(() => {})
    }

    emitReportSubmitted({ reportId: report._id, referenceNumber, reportType, priority })

    res.status(201).json({
      message: 'Report submitted. Our moderation team will review it shortly.',
      report: {
        _id: report._id,
        referenceNumber: report.referenceNumber,
        status: report.status,
        priority: report.priority,
        createdAt: report.createdAt,
      },
      estimatedReviewTime: '24–48 hours',
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reports/status?reportType=&listingId=&reportedUserId= ───────────
// Lets the frontend pre-check for an existing open report before even
// opening the report modal.

exports.getReportStatus = async (req, res, next) => {
  try {
    const { reportType, listingId, reportedUserId } = req.query
    if (!['listing', 'user'].includes(reportType)) throw new ApiError(400, 'reportType must be "listing" or "user"')

    const targetFilter = reportType === 'listing'
      ? { reportType: 'listing', listing: listingId }
      : { reportType: 'user', reportedUser: reportedUserId }

    const existing = await Report.findOne({
      reporter: req.user._id,
      ...targetFilter,
      status: { $in: OPEN_STATUSES },
    }).select('referenceNumber status createdAt').lean()

    res.json({ alreadyReported: !!existing, report: existing || null })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reports/mine  (protected) ────────────────────────────────────────

exports.getMyReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .select('-adminNotes')
      .populate('listing', 'title images')
      .populate('reportedUser', 'name profileImage')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ reports })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reports/mine/:id  (protected, owner only) ────────────────────────

exports.getMyReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .select('-adminNotes')
      .populate('listing', 'title images')
      .populate('reportedUser', 'name profileImage')
      .lean()

    if (!report) throw new ApiError(404, 'Report not found')
    if (String(report.reporter) !== String(req.user._id)) {
      throw new ApiError(403, 'You can only view your own reports')
    }

    res.json({ report })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/reports/mine/:id/evidence  (protected, owner only, multipart) ──
// Reopens a report that's waiting for more evidence — never creates a new one.

exports.submitAdditionalEvidence = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
    if (!report) throw new ApiError(404, 'Report not found')
    if (String(report.reporter) !== String(req.user._id)) {
      throw new ApiError(403, 'You can only respond to your own reports')
    }
    if (report.status !== 'waiting_for_evidence') {
      throw new ApiError(400, 'This report is not currently waiting for more evidence')
    }
    if (!req.files || req.files.length === 0) throw new ApiError(400, 'At least one file is required')
    if (req.files.length > 5) throw new ApiError(400, 'A maximum of 5 files may be uploaded')

    const uploaded = await Promise.all(req.files.map(uploadEvidence))
    report.additionalEvidence.push(...uploaded)
    report.status = 'in_review'
    report.timeline.push({ action: 'additional_evidence_submitted', by: req.user._id, at: new Date() })
    await report.save()

    res.json({ message: 'Additional evidence submitted', report })
  } catch (err) {
    next(err)
  }
}
