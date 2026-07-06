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
      required: [true, 'Description is required'],
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
    images: {
      type: [{ type: String }],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one image is required',
      },
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      city:  { type: String, required: [true, 'City is required'] },
      state: { type: String, required: [true, 'State is required'] },
      area:  { type: String, default: '' },
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'sold', 'paused', 'removed'],
      default: 'active',
    },
    // ── Admin moderation ─────────────────────────────────────────────────────
    // Hidden listings stay visible to their seller (with the reason shown) and
    // to admins, but disappear everywhere the public marketplace surfaces them.
    isHidden: { type: Boolean, default: false },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hiddenReason: { type: String, default: '' },
    hiddenAt: { type: Date, default: null },
    // Removal is a soft-delete — status becomes 'removed', the document is
    // kept for audit purposes, and it can be restored later.
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    removedReason: { type: String, default: '' },
    removedAt: { type: Date, default: null },
    // Remembers the status the listing had right before removal, so Restore
    // can put it back where it was instead of always defaulting to 'active'.
    preRemovalStatus: { type: String, default: null },
    // Future-ready featured-listing flag
    featured: { type: Boolean, default: false },
    featuredUntil: { type: Date, default: null },
    featuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    featuredReason: { type: String, default: '' },
    featuredAt: { type: Date, default: null },
    reportsCount: { type: Number, default: 0 },
    // Internal-only admin notes — never exposed to buyers/sellers.
    adminNotes: {
      type: [{
        text:    { type: String, required: true, trim: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      }],
      default: [],
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
      // Anti-collusion hook (Phase 12D) — set by future pattern-detection
      // (repeat pairs, velocity, price anomalies), never by hand. When true,
      // trustEngine's collusionGuard excludes this deal from trust entirely.
      flaggedSuspicious:   { type: Boolean, default: false },
    },
    viewsCount:     { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Listing', listingSchema)
