const mongoose = require('mongoose')

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      id:   { type: String, required: true },
      name: { type: String, required: true },
    },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair', 'poor'],
      default: 'good',
    },
    price: {
      amount:     { type: Number, required: true, min: 0 },
      negotiable: { type: Boolean, default: false },
    },
    images: [{ type: String }],
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      city:  { type: String, default: '' },
      state: { type: String, default: '' },
      area:  { type: String, default: '' },
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'sold', 'paused'],
      default: 'active',
    },
    // Embedded transaction — set when seller marks SOLD and selects a buyer.
    // Reviews are locked behind transaction.completedAt being non-null.
    transaction: {
      buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      sellerConfirmed: { type: Boolean, default: false },
      buyerConfirmed:  { type: Boolean, default: false },
      completedAt:     { type: Date,    default: null  },
      // Cancellation fields — set when either party cancels before completion
      cancelled:           { type: Boolean, default: false },
      cancelledAt:         { type: Date,    default: null  },
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      cancellationReason:  { type: String,  default: ''   },
    },
    viewsCount:     { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Listing', listingSchema)
