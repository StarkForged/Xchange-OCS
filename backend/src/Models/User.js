const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    isVerifiedSeller: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Trust & Reputation (Xchange Trust Framework v2 — Phase 12D) ─────────
    // `trustScore` is the final DISPLAYED score (post multiplier) — kept as a
    // top-level field so every existing read site (listing cards, admin
    // tables, etc.) keeps working unchanged. `trust` holds the full engine
    // output and is the thing new UI should read from going forward.
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // No email-OTP / SMS-OTP flow exists yet — email is treated as verified
    // once a valid, unique address is on file (matches signup validation);
    // phone verification is a distinct, explicit step and defaults to false.
    emailVerified: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: false },
    trust: {
      pillars: {
        identity:     { type: Number, default: 0 },
        transactions: { type: Number, default: 0 },
        reviews:      { type: Number, default: 0 },
        activity:     { type: Number, default: 0 },
        moderation:   { type: Number, default: 20 },
      },
      // Own-dashboard-only granular detail behind each pillar (see trustEngine.js).
      details:          { type: mongoose.Schema.Types.Mixed, default: {} },
      raw:              { type: Number, default: 0 },   // sum of pillars, pre-multiplier
      multiplier:        { type: Number, default: 1 },   // Trust Penalty Multiplier
      displayed:        { type: Number, default: 0 },   // raw * multiplier == trustScore
      tier:             { type: String, default: 'New Member' },
      tierStars:        { type: Number, default: 1 },
      // The ONLY trust-derived thing public users ever see (Phase 12D.1).
      publicBadge: {
        emoji:    { type: String, default: '🟡' },
        label:    { type: String, default: 'Building Trust' },
        colorKey: { type: String, default: 'yellow' },
      },
      revealed:         { type: Boolean, default: false }, // progressive disclosure gate
      reasons:          [{ type: String }],               // "Why buyers trust this member"
      lastCalculatedAt: { type: Date, default: null },
    },
    // Chronological trust change log — own profile/dashboard only, never public.
    trustHistory: [
      {
        type:        { type: String, required: true }, // trigger id, e.g. 'review_received'
        description: { type: String, default: '' },
        pillar:      { type: String, default: null },
        delta:       { type: Number, default: 0 },
        createdAt:   { type: Date, default: Date.now },
      },
    ],
    // Confirmed (not pending) moderation actions against this seller's listings.
    // Drives the Moderation pillar and its severity-based Trust Recovery.
    moderationRecord: [
      {
        severity:    { type: String, enum: ['minor', 'medium', 'critical'], required: true },
        reason:      { type: String, default: '' },
        listing:     { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null },
        confirmedAt: { type: Date, default: Date.now },
        // Placeholder appeal workflow (Phase 12D.1) — UI + a stub endpoint
        // only; no admin review queue exists yet.
        appealStatus: { type: String, enum: ['none', 'pending', 'reviewed'], default: 'none' },
        appealedAt:   { type: Date, default: null },
      },
    ],
    // Second confirmed critical moderation ⇒ permanent ban (no further trust calc).
    criticalStrikes: { type: Number, default: 0 },
    // Quarters (e.g. "2026-Q1") in which real marketplace activity was
    // observed — recorded lazily as recalculation happens, not backfilled.
    activeQuarters: [{ type: String }],
    // Stored 0–100; recomputed on every profile save via profileCompletion utility.
    profileCompletion: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Badges earned by this user. earnedAt is set once and preserved on recompute.
    badges: [
      {
        id:          { type: String },
        label:       { type: String },
        description: { type: String },
        icon:        { type: String },
        earnedAt:    { type: Date, default: Date.now },
      },
    ],
    // Seller response metrics — recomputed from Chat/Message on profile fetch.
    sellerMetrics: {
      totalInquiries:     { type: Number, default: 0 },
      respondedInquiries: { type: Number, default: 0 },
      responseRate:       { type: Number, default: 0 },   // 0–100
      avgResponseTimeMs:  { type: Number, default: null },
      lastActiveAt:       { type: Date,   default: null },
    },
    // Transaction reliability counters — incremented atomically when deals complete/cancel.
    completedDeals:      { type: Number, default: 0, min: 0 },
    // Role-specific cancellation counters.
    // Only the party who initiated the cancellation receives a penalty.
    buyerCancelledDeals:  { type: Number, default: 0, min: 0 },
    sellerCancelledDeals: { type: Number, default: 0, min: 0 },

    // Ghost seller detection. Flagged = score >= 50.
    ghostRisk: {
      score:       { type: Number,  default: 0 },
      flagged:     { type: Boolean, default: false },
      lastChecked: { type: Date,    default: null },
    },

    // ── Reporting system ─────────────────────────────────────────────────────
    // reporterStats: this user's track record when they file reports on others.
    // reportedStats: this user's track record as the target of others' reports.
    // Trust-score integration is deliberately deferred — these are data only.
    reporterStats: {
      totalReports:   { type: Number, default: 0 },
      validReports:   { type: Number, default: 0 },
      falseReports:   { type: Number, default: 0 },
      pendingReports: { type: Number, default: 0 },
    },
    reportedStats: {
      reportsReceived:  { type: Number, default: 0 },
      validReports:     { type: Number, default: 0 },
      dismissedReports: { type: Number, default: 0 },
      resolvedReports:  { type: Number, default: 0 },
    },

    // ── Saved listings ─────────────────────────────────────────────────────
    savedListings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
      },
    ],

    // ── Marketplace intelligence ────────────────────────────────────────────
    // Last 10 listing views; newest first. Deduplicated before insert.
    recentlyViewed: [
      {
        listing:  { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    // Last 10 search queries; newest first, case-normalised, deduplicated.
    recentSearches: [
      {
        query:      { type: String, trim: true },
        searchedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
)

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password)
}

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject()
  delete obj.password
  return obj
}

module.exports = mongoose.model('User', userSchema)
