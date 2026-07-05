const mongoose = require('mongoose')

const REPORT_REASONS = [
  'spam',
  'duplicate',
  'fraudulent',
  'inappropriate',
  'misleading',
  'counterfeit',
  'other',
]

const reportSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'dismissed', 'actioned'],
      default: 'pending',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

reportSchema.statics.REASONS = REPORT_REASONS

module.exports = mongoose.model('Report', reportSchema)
