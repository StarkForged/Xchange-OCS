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
    lastMessage: {
      text:      { type: String,   default: '' },
      sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
)

// One chat per listing per unique participant pair
chatSchema.index({ listing: 1, participants: 1 })

module.exports = mongoose.model('Chat', chatSchema)
