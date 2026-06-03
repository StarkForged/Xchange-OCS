const mongoose = require('mongoose')
const Review   = require('../Models/Review')
const Listing  = require('../Models/Listing')
const ApiError = require('../Utils/ApiError')

// ── POST /api/reviews ─────────────────────────────────────────────────────────
// Create a review. Allowed only after transaction.completedAt is set.

exports.createReview = async (req, res, next) => {
  try {
    const { listingId, rating, comment } = req.body
    const reviewerId = req.user._id

    if (!listingId) throw new ApiError(400, 'listingId is required')
    if (!mongoose.Types.ObjectId.isValid(listingId)) throw new ApiError(400, 'Invalid listingId')
    if (!rating || rating < 1 || rating > 5) throw new ApiError(400, 'rating must be 1–5')

    const listing = await Listing.findById(listingId).lean()
    if (!listing) throw new ApiError(404, 'Listing not found')

    // Rule 1: listing must be sold
    if (listing.status !== 'sold') {
      throw new ApiError(403, 'Reviews are only allowed for completed transactions')
    }

    // Rule 2: transaction must be completed
    if (!listing.transaction?.completedAt) {
      throw new ApiError(403, 'Both parties must confirm the transaction before leaving a review')
    }

    const sellerId = String(listing.seller)
    const buyerId  = listing.transaction?.buyer ? String(listing.transaction.buyer) : null
    const meStr    = String(reviewerId)

    // Rule 3: reviewer must be a transaction participant
    if (meStr !== sellerId && meStr !== buyerId) {
      throw new ApiError(403, 'You were not a participant in this transaction')
    }

    // Rule 4: reviewer and reviewee must differ
    const revieweeId = meStr === sellerId ? buyerId : sellerId
    if (!revieweeId) throw new ApiError(400, 'Transaction buyer not set')

    // Rule 5: enforce one review per listing per user (DB unique index handles it too)
    const existing = await Review.findOne({ listing: listingId, reviewer: reviewerId })
    if (existing) throw new ApiError(409, 'You have already reviewed this transaction')

    const role = meStr === buyerId ? 'buyer' : 'seller'

    const review = await Review.create({
      reviewer: reviewerId,
      reviewee: revieweeId,
      listing:  listingId,
      rating:   Number(rating),
      comment:  comment?.trim() || '',
      role,
    })

    const populated = await Review.findById(review._id)
      .populate('reviewer', 'name profileImage')
      .populate('reviewee', 'name profileImage')
      .lean()

    res.status(201).json({ review: populated })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reviews/me ───────────────────────────────────────────────────────
// Reviews written about the current user

exports.getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewee: req.user._id })
      .populate('reviewer', 'name profileImage')
      .populate('listing', 'title images')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ reviews })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reviews/user/:userId ─────────────────────────────────────────────
// Public: reviews written about a specific user

exports.getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new ApiError(400, 'Invalid userId')

    const reviews = await Review.find({ reviewee: userId })
      .populate('reviewer', 'name profileImage')
      .populate('listing', 'title images')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ reviews })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reviews/listing/:listingId ───────────────────────────────────────

exports.getListingReviews = async (req, res, next) => {
  try {
    const { listingId } = req.params
    if (!mongoose.Types.ObjectId.isValid(listingId)) throw new ApiError(400, 'Invalid listingId')

    const reviews = await Review.find({ listing: listingId })
      .populate('reviewer', 'name profileImage')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ reviews })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/reviews/stats/:userId ────────────────────────────────────────────
// Aggregated rating breakdown for a user

exports.getReviewStats = async (req, res, next) => {
  try {
    const { userId } = req.params
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new ApiError(400, 'Invalid userId')

    const reviews = await Review.find({ reviewee: userId }).select('rating').lean()
    const reviewCount = reviews.length

    if (reviewCount === 0) {
      return res.json({
        averageRating: 0,
        reviewCount: 0,
        ratings: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      })
    }

    const ratings = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    let total = 0
    for (const r of reviews) {
      ratings[r.rating] = (ratings[r.rating] || 0) + 1
      total += r.rating
    }

    const averageRating = Math.round((total / reviewCount) * 10) / 10

    res.json({ averageRating, reviewCount, ratings })
  } catch (err) {
    next(err)
  }
}
