const mongoose = require('mongoose')

// ── Report taxonomy ────────────────────────────────────────────────────────────
// One flexible, future-proof Report model — reportType discriminates what is
// being reported (listing/user today; message/conversation/review later)
// without needing separate collections or a schema migration.

const REPORT_TYPES = ['listing', 'user', 'message', 'conversation', 'review']

const LISTING_REASONS = [
  'scam_fraud',
  'fake_product',
  'counterfeit',
  'misleading_description',
  'wrong_category',
  'duplicate_listing',
  'spam',
  'prohibited_item',
  'stolen_property',
  'offensive_content',
  'other',
]

const USER_REASONS = [
  'fraud',
  'fake_identity',
  'harassment',
  'threatening_behavior',
  'no_show',
  'payment_outside_platform',
  'suspicious_activity',
  'spam',
  'other',
]

// Union of every reason across every report type — kept as a single enum so
// the schema doesn't need to change when new report types are added. Which
// subset is valid for a given reportType is enforced in the controller.
const ALL_REASONS = [...new Set([...LISTING_REASONS, ...USER_REASONS])]

const PRIORITIES = ['low', 'medium', 'high', 'critical']
const STATUSES = ['submitted', 'in_review', 'waiting_for_evidence', 'resolved', 'dismissed']

const attachmentSchema = new mongoose.Schema(
  {
    url:      { type: String, required: true },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size:     { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const adminNoteSchema = new mongoose.Schema(
  {
    text:    { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

// Free-form action + timestamp log — every moderation action appends here,
// so the full lifecycle (Submitted → Viewed → Under Review → Evidence
// Reviewed → Action Taken → Closed) is always reconstructable.
const timelineEventSchema = new mongoose.Schema(
  {
    action:  { type: String, required: true },
    by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note:    { type: String, default: '' },
    at:      { type: Date, default: Date.now },
  },
  { _id: false }
)

const reportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: REPORT_TYPES,
      required: true,
    },

    // ── Target being reported — exactly one of these is set, depending on reportType ──
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Future-ready targets — not populated by any UI yet, but the schema
    // already supports them so message/conversation/review reporting can
    // ship later without a migration.
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', default: null },
    review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', default: null },

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    reason: {
      type: String,
      enum: ALL_REASONS,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 30,
      maxlength: 1000,
    },

    // Evidence uploaded at submission time — mandatory (>= 1 enforced in controller).
    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    // Evidence uploaded later, e.g. in response to an admin's
    // "Waiting for More Evidence" request. Never a new report — same document.
    additionalEvidence: {
      type: [attachmentSchema],
      default: [],
    },

    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'low',
    },

    status: {
      type: String,
      enum: STATUSES,
      default: 'submitted',
    },

    referenceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // Internal-only — never exposed to reporter or reported user.
    adminNotes: {
      type: [adminNoteSchema],
      default: [],
    },

    timeline: {
      type: [timelineEventSchema],
      default: () => [{ action: 'submitted', at: new Date() }],
    },

    resolution: {
      type: String,
      default: '',
      trim: true,
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },

    // Set when this report is identified as a duplicate of an earlier one on
    // the same target — kept instead of deleted, for audit purposes.
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },

    // Set by an admin when a report turns out to be unfounded/abusive. Feeds
    // the reporter's falseReports counter; trust-score impact comes later.
    falseReport: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// One open report per (reporter, target) — the controller checks this before
// insert and returns the existing report instead of creating a duplicate.
reportSchema.index({ reporter: 1, reportType: 1, listing: 1, reportedUser: 1, status: 1 })

reportSchema.statics.REPORT_TYPES = REPORT_TYPES
reportSchema.statics.LISTING_REASONS = LISTING_REASONS
reportSchema.statics.USER_REASONS = USER_REASONS
reportSchema.statics.PRIORITIES = PRIORITIES
reportSchema.statics.STATUSES = STATUSES

module.exports = mongoose.model('Report', reportSchema)
