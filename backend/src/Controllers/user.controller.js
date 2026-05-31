const mongoose = require('mongoose')
const User     = require('../Models/User')
const Listing  = require('../Models/Listing')
const ApiError = require('../Utils/ApiError')

const { computeTrustScore }        = require('../Utils/trustScore')
const { computeProfileCompletion } = require('../Utils/profileCompletion')
const {
  computeResponseMetrics,
  computeGhostRisk,
  computeBadges,
} = require('../Utils/sellerMetrics')

// ── Internal: recompute and persist all reputation fields ─────────────────────

async function refreshReputation(user) {
  const listingCount = await Listing.countDocuments({ seller: user._id })

  // 1. Response metrics (DB-derived; heaviest step)
  const metrics = await computeResponseMetrics(user._id)

  // 2. Profile completion
  const { pct: profileCompletion, checks: completionChecks } =
    computeProfileCompletion(user, listingCount)

  // 3. Trust score (uses metrics for response bonus)
  const { score: trustScore, breakdown } =
    computeTrustScore(user, listingCount, metrics)

  // 4. Ghost risk
  const ghostRisk = computeGhostRisk(metrics)

  // 5. Badges (uses fresh trustScore, not stale DB value)
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
        createdAt:         user.createdAt,
      },
      trustBreakdown: rep.breakdown,
    })
  } catch (err) {
    next(err)
  }
}

// ── PUT /api/users/profile ────────────────────────────────────────────────────

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, phone, location, profileImage } = req.body

    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, 'User not found')

    if (name?.trim())            user.name         = name.trim()
    if (bio      !== undefined)  user.bio          = bio.trim()
    if (phone    !== undefined)  user.phone        = phone.trim()
    if (location !== undefined)  user.location     = location.trim()
    if (profileImage !== undefined) user.profileImage = profileImage

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
        createdAt:         user.createdAt,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/users/:userId  (public — shown on listing detail page) ───────────

exports.getPublicProfile = async (req, res, next) => {
  try {
    const { userId } = req.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID')
    }

    const user = await User.findById(userId).lean()
    if (!user) throw new ApiError(404, 'User not found')

    const listingCount = await Listing.countDocuments({ seller: userId })

    // For a public view, return pre-computed reputation fields only.
    // Avoid running the heavy refreshReputation on every listing page load.
    res.json({
      user: {
        _id:               user._id,
        name:              user.name,
        profileImage:      user.profileImage,
        trustScore:        user.trustScore,
        profileCompletion: user.profileCompletion,
        badges:            user.badges || [],
        sellerMetrics: {
          responseRate:      user.sellerMetrics?.responseRate      ?? 0,
          avgResponseTimeMs: user.sellerMetrics?.avgResponseTimeMs ?? null,
          totalInquiries:    user.sellerMetrics?.totalInquiries    ?? 0,
          lastActiveAt:      user.sellerMetrics?.lastActiveAt      ?? null,
        },
        ghostRisk: {
          flagged: user.ghostRisk?.flagged ?? false,
        },
        listingCount,
        createdAt: user.createdAt,
      },
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
