const mongoose = require('mongoose')

// Append-only event log powering the "Moderation Timeline" on the admin
// listing detail page. Kept separate from the sparse hiddenAt/removedAt
// fields on Listing (which only remember the *latest* state change) so a
// listing that's hidden, unhidden, then hidden again still shows full history.
const ACTIONS = [
  'created',
  'reported',
  'hidden',
  'unhidden',
  'removed',
  'restored',
  'featured',
  'unfeatured',
]

const moderationLogSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    action: {
      type: String,
      enum: ACTIONS,
      required: true,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

moderationLogSchema.index({ listing: 1, createdAt: -1 })
moderationLogSchema.statics.ACTIONS = ACTIONS

module.exports = mongoose.model('ModerationLog', moderationLogSchema)
