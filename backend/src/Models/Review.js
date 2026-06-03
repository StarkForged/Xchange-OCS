const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    // 'buyer' = reviewer was the buyer; 'seller' = reviewer was the seller
    role: {
      type: String,
      enum: ['buyer', 'seller'],
      required: true,
    },
  },
  { timestamps: true }
)

// One review per listing per reviewer (enforced at DB level)
reviewSchema.index({ listing: 1, reviewer: 1 }, { unique: true })

module.exports = mongoose.model('Review', reviewSchema)
