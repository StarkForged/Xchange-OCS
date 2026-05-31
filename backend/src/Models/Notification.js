const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, enum: ['message', 'listing', 'save', 'system'], default: 'system' },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read:    { type: Boolean, default: false },
    link:    { type: String, default: '' },  // client-side route to navigate on click
  },
  { timestamps: true }
)

notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ user: 1, read: 1 })

module.exports = mongoose.model('Notification', notificationSchema)
