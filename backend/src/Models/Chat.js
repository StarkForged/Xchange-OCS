const mongoose = require('mongoose')

const chatSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    // Deterministic composite key: listingId + ':' + sortedParticipantIds
    // Enforces one chat per listing per unique participant pair at the DB level.
    chatKey: {
      type: String,
    },
    lastMessage: {
      text:      { type: String,   default: '' },
      sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
)

// sparse: true so pre-migration documents (no chatKey) don't all collide on null.
// Run backend/scripts/cleanupDuplicateChats.js once after deploying to backfill existing chats.
chatSchema.index({ chatKey: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('Chat', chatSchema)
