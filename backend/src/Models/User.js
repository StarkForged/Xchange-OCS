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

    // ── Trust & Reputation ─────────────────────────────────────────────────
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
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
    // Ghost seller detection. Flagged = score >= 50.
    ghostRisk: {
      score:       { type: Number,  default: 0 },
      flagged:     { type: Boolean, default: false },
      lastChecked: { type: Date,    default: null },
    },

    // ── Saved listings ─────────────────────────────────────────────────────
    // $addToSet ensures no duplicates at the DB level.
    savedListings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
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
