const mongoose = require('mongoose')
const User     = require('../Models/User')
const Listing  = require('../Models/Listing')
const Review   = require('../Models/Review')
const ApiError = require('../Utils/ApiError')

const { computeTrustScore }        = require('../Utils/trustScore')
const { computeProfileCompletion } = require('../Utils/profileCompletion')
const {
  computeResponseMetrics,
  computeGhostRisk,
  computeBadges,
} = require('../Utils/sellerMetrics')

// ── Internal: compute review stats for a user ────────────────────────────────

async function computeReviewStats(userId) {
  const [reviews, userCounters] = await Promise.all([
    Review.find({ reviewee: userId }).select('rating').lean(),
    User.findById(userId).select('completedDeals buyerCancelledDeals sellerCancelledDeals').lean(),
  ])

  const reviewCount         = reviews.length
  const completedDeals      = userCounters?.completedDeals       ?? 0
  const buyerCancelledDeals  = userCounters?.buyerCancelledDeals  ?? 0
  const sellerCancelledDeals = userCounters?.sellerCancelledDeals ?? 0

  // responsibleCancellations = only deals THIS user chose to cancel.
  // Deals cancelled by the other party do not penalise this user.
  const responsibleCancellations = buyerCancelledDeals + sellerCancelledDeals
  const totalTx        = completedDeals + responsibleCancellations
  const completionRate = totalTx > 0
    ? Math.round((completedDeals / totalTx) * 100)
    : 100  // no history yet → full marks by default

  const base = { completedDeals, buyerCancelledDeals, sellerCancelledDeals, responsibleCancellations, completionRate }

  if (reviewCount === 0) {
    return { averageRating: 0, reviewCount: 0, ...base }
  }

  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  const averageRating = Math.round((total / reviewCount) * 10) / 10

  return { averageRating, reviewCount, ...base }
}

// ── Internal: recompute and persist all reputation fields ─────────────────────

async function refreshReputation(user) {
  const listingCount = await Listing.countDocuments({ seller: user._id })

  // 1. Response metrics (DB-derived; heaviest step)
  const metrics = await computeResponseMetrics(user._id)

  // 2. Profile completion
  const { pct: profileCompletion, checks: completionChecks } =
    computeProfileCompletion(user, listingCount)

  // 3. Review stats for trust score integration
  const reviewStats = await computeReviewStats(user._id)

  // 4. Trust score (uses metrics + reviewStats)
  const { score: trustScore, breakdown } =
    computeTrustScore(user, listingCount, metrics, reviewStats)

  // 5. Ghost risk
  const ghostRisk = computeGhostRisk(metrics)

  // 6. Badges (uses fresh trustScore, not stale DB value)
  const badges = computeBadges(user, metrics, listingCount, profileCompletion, trustScore)

  // Persist only if anything changed (avoids unnecessary writes)
  const hasChanged =
    user.trustScore        !== trustScore       ||
    user.profileCompletion !== profileCompletion

  if (hasChanged ||
      user.ghostRisk?.lastChecked == null ||
      Date.now() - new Date(user.ghostRisk.lastChecked) > 3_600_000  // re-check hourly
  ) {
    user.trustScore        = trustScore
    user.profileCompletion = profileCompletion
    user.sellerMetrics     = metrics
    user.ghostRisk         = ghostRisk
    user.badges            = badges
    await user.save()
  }

  return {
    trustScore,
    profileCompletion,
    breakdown,
    completionChecks,
    metrics,
    ghostRisk,
    badges,
    listingCount,
    reviewStats,
  }
}

// ── GET /api/users/profile ────────────────────────────────────────────────────

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, 'User not found')

    const rep = await refreshReputation(user)

    res.json({
      user: {
        _id:               user._id,
        name:              user.name,
        email:             user.email,
        role:              user.role,
        profileImage:      user.profileImage,
        bio:               user.bio,
        phone:             user.phone,
        location:          user.location,
        trustScore:        rep.trustScore,
        profileCompletion: rep.profileCompletion,
        badges:            rep.badges,
        sellerMetrics:     rep.metrics,
        ghostRisk:         rep.ghostRisk,
        reviewStats:       rep.reviewStats,
        createdAt:         user.createdAt,
      },
      trustBreakdown: rep.breakdown,
    })
  } catch (err) {
    next(err)
  }
}

// ── PUT /api/users/profile ────────────────────────────────────────────────────
// Requires current password for verification before applying any changes.

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, phone, location, profileImage, password } = req.body

    if (!password) throw new ApiError(400, 'Password is required to save changes')

    // Fetch with password field (select: false by default)
    const user = await User.findById(req.user._id).select('+password')
    if (!user) throw new ApiError(404, 'User not found')

    const isMatch = await user.matchPassword(password)
    if (!isMatch) throw new ApiError(401, 'Incorrect password')

    // Apply profile field updates
    if (name?.trim())               user.name         = name.trim()
    if (bio      !== undefined)     user.bio          = bio.trim()
    if (phone    !== undefined)     user.phone        = phone.trim()
    if (location !== undefined)     user.location     = location.trim()
    if (profileImage !== undefined) user.profileImage = profileImage

    // Always persist profile fields immediately — do not rely on refreshReputation's
    // conditional save, which only fires when trust/completion values change.
    await user.save()

    const rep = await refreshReputation(user)

    res.json({
      user: {
        _id:               user._id,
        name:              user.name,
        email:             user.email,
        role:              user.role,
        profileImage:      user.profileImage,
        bio:               user.bio,
        phone:             user.phone,
        location:          user.location,
        trustScore:        rep.trustScore,
        profileCompletion: rep.profileCompletion,
        badges:            rep.badges,
        sellerMetrics:     rep.metrics,
        ghostRisk:         rep.ghostRisk,
        reviewStats:       rep.reviewStats,
        createdAt:         user.createdAt,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/users/:userId  (public profile page) ────────────────────────────

exports.getPublicProfile = async (req, res, next) => {
  try {
    const { userId } = req.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID')
    }

    const user = await User.findById(userId).lean()
    if (!user) throw new ApiError(404, 'User not found')

    const [listingCount, activeListings, reviewStats, recentReviews] = await Promise.all([
      Listing.countDocuments({ seller: userId }),
      Listing.find({ seller: userId, status: 'active' })
        .select('title price images category location createdAt viewsCount')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      computeReviewStats(userId),
      Review.find({ reviewee: userId })
        .populate('reviewer', 'name profileImage')
        .populate('listing', 'title')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ])

    res.json({
      user: {
        _id:          user._id,
        name:         user.name,
        profileImage: user.profileImage,
        bio:          user.bio || '',
        location:     user.location || '',
        trustScore:   user.trustScore,
        badges:       user.badges || [],
        sellerMetrics: {
          responseRate:      user.sellerMetrics?.responseRate      ?? 0,
          avgResponseTimeMs: user.sellerMetrics?.avgResponseTimeMs ?? null,
          totalInquiries:    user.sellerMetrics?.totalInquiries    ?? 0,
          lastActiveAt:      user.sellerMetrics?.lastActiveAt      ?? null,
        },
        ghostRisk: {
          flagged: user.ghostRisk?.flagged ?? false,
        },
        reviewStats,
        listingCount,
        activeListingCount: activeListings.length,
        createdAt: user.createdAt,
      },
      activeListings,
      recentReviews,
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/users/saved/:listingId  (toggle save/unsave) ───────────────────

exports.toggleSavedListing = async (req, res, next) => {
  try {
    const { listingId } = req.params

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      throw new ApiError(400, 'Invalid listing ID')
    }

    const listing = await Listing.findById(listingId)
    if (!listing) throw new ApiError(404, 'Listing not found')

    const user = await User.findById(req.user._id).select('savedListings')
    if (!user) throw new ApiError(404, 'User not found')

    const alreadySaved = user.savedListings.some(
      (id) => id.toString() === listingId
    )

    if (alreadySaved) {
      await User.updateOne({ _id: req.user._id }, { $pull: { savedListings: listing._id } })
      if (listing.favoritesCount > 0) {
        await Listing.updateOne({ _id: listingId }, { $inc: { favoritesCount: -1 } })
      }
    } else {
      await User.updateOne(
        { _id: req.user._id },
        { $addToSet: { savedListings: listing._id } }
      )
      await Listing.updateOne({ _id: listingId }, { $inc: { favoritesCount: 1 } })
    }

    const updated = await User.findById(req.user._id).select('savedListings')

    res.json({
      saved:           !alreadySaved,
      savedListingIds: updated.savedListings.map((id) => id.toString()),
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/users/viewed/:listingId ─────────────────────────────────────────

exports.trackView = async (req, res, next) => {
  try {
    const { listingId } = req.params
    if (!mongoose.Types.ObjectId.isValid(listingId)) return res.json({ ok: true })

    // Pull any existing entry for this listing, then prepend a fresh one (dedup)
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { recentlyViewed: { listing: listingId } } }
    )
    await User.updateOne(
      { _id: req.user._id },
      {
        $push: {
          recentlyViewed: {
            $each:     [{ listing: listingId, viewedAt: new Date() }],
            $position: 0,
            $slice:    10,
          },
        },
      }
    )

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/users/viewed ─────────────────────────────────────────────────────

exports.getRecentlyViewed = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('recentlyViewed')
      .populate({
        path:    'recentlyViewed.listing',
        select:  'title price images category location status seller createdAt viewsCount',
        populate: { path: 'seller', select: 'name trustScore badges ghostRisk' },
      })
      .lean()

    if (!user) return res.json({ listings: [] })

    const listings = user.recentlyViewed
      .filter((v) => v.listing && v.listing.status !== 'inactive')
      .map((v) => ({ ...v.listing, viewedAt: v.viewedAt }))

    res.json({ listings })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/users/searches ──────────────────────────────────────────────────

exports.addSearch = async (req, res, next) => {
  try {
    const raw = req.body?.query?.trim()
    if (!raw || raw.length < 2) return res.json({ ok: true })

    const query = raw.toLowerCase()

    // Remove existing duplicate first, then prepend (atomic two-op approach)
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { recentSearches: { query } } }
    )
    await User.updateOne(
      { _id: req.user._id },
      {
        $push: {
          recentSearches: {
            $each:     [{ query, searchedAt: new Date() }],
            $position: 0,
            $slice:    10,
          },
        },
      }
    )

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/users/searches ───────────────────────────────────────────────────

exports.getSearches = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('recentSearches').lean()
    res.json({ searches: user?.recentSearches ?? [] })
  } catch (err) {
    next(err)
  }
}

// ── DELETE /api/users/searches ────────────────────────────────────────────────

exports.clearSearches = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { recentSearches: [] } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/users/saved ─────────────────────────────────────────────────────

exports.getSavedListings = async (req, res, next) => {
  try {
    const user = await User
      .findById(req.user._id)
      .select('savedListings')
      .populate({
        path:    'savedListings',
        populate: { path: 'seller', select: 'name profileImage trustScore' },
        options:  { sort: { createdAt: -1 } },
      })

    if (!user) throw new ApiError(404, 'User not found')

    const listings = (user.savedListings || []).filter(Boolean)

    res.json({
      listings,
      savedListingIds: listings.map((l) => l._id.toString()),
    })
  } catch (err) {
    next(err)
  }
}
