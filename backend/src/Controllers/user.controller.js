const mongoose = require('mongoose')
const User     = require('../Models/User')
const Listing  = require('../Models/Listing')
const Review   = require('../Models/Review')
const ApiError = require('../Utils/ApiError')

const { recalculateTrust } = require('../Services/trustEngine')
const { redactListingSeller } = require('../Utils/publicTrust')

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
// Delegates the actual five-pillar calculation to trustEngine (the single
// source of truth); this wrapper just re-checks hourly like the old ghostRisk
// cadence did, and shapes the return value the two profile endpoints expect.

async function refreshReputation(user, trigger = 'recalculation') {
  const stale =
    !user.trust?.lastCalculatedAt ||
    Date.now() - new Date(user.trust.lastCalculatedAt) > 3_600_000

  if (stale) {
    await recalculateTrust(user, { trigger })
  }

  const reviewStats = await computeReviewStats(user._id)

  return {
    trustScore:        user.trustScore,
    profileCompletion: user.profileCompletion,
    trust:             user.trust,
    trustHistory:      user.trustHistory,
    metrics:           user.sellerMetrics,
    ghostRisk:         user.ghostRisk,
    badges:            user.badges,
    reviewStats,
  }
}

// ── GET /api/users/profile ────────────────────────────────────────────────────

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, 'User not found')

    // Own profile/dashboard always sees the real numbers — progressive
    // disclosure ("Building Trust") only applies to what OTHER users see.
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
        emailVerified:     user.emailVerified,
        phoneVerified:     user.phoneVerified,
        isVerifiedSeller:  user.isVerifiedSeller,
        trustScore:        rep.trustScore,
        profileCompletion: rep.profileCompletion,
        badges:            rep.badges,
        sellerMetrics:     rep.metrics,
        ghostRisk:         rep.ghostRisk,
        reviewStats:       rep.reviewStats,
        // Owner-only (Trust Centre) — never sent from getPublicProfile.
        moderationRecord:  user.moderationRecord,
        criticalStrikes:   user.criticalStrikes,
        accountStatus:     user.accountStatus,
        createdAt:         user.createdAt,
      },
      trust:        rep.trust,
      trustHistory: rep.trustHistory,
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

    // Always persist profile fields immediately — do not rely on trust
    // recalculation's conditional save.
    await user.save()

    // Profile edits are a trust-relevant event — recalculate now rather than
    // waiting for the hourly staleness check, so "Complete Profile" (+6,
    // Identity pillar) reflects immediately.
    await recalculateTrust(user, { trigger: 'profile_completed' })
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
        emailVerified:     user.emailVerified,
        phoneVerified:     user.phoneVerified,
        isVerifiedSeller:  user.isVerifiedSeller,
        trustScore:        rep.trustScore,
        profileCompletion: rep.profileCompletion,
        badges:            rep.badges,
        sellerMetrics:     rep.metrics,
        ghostRisk:         rep.ghostRisk,
        reviewStats:       rep.reviewStats,
        // Owner-only (Trust Centre) — never sent from getPublicProfile.
        moderationRecord:  user.moderationRecord,
        criticalStrikes:   user.criticalStrikes,
        accountStatus:     user.accountStatus,
        createdAt:         user.createdAt,
      },
      trust: rep.trust,
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/users/verify-phone  (self-service; no SMS/OTP provider wired
// up yet — this simulates the "phone verified" step so the Identity pillar
// and badges can be exercised end-to-end. Swap for real OTP verification
// later without touching the trust engine.) ──────────────────────────────

exports.verifyPhone = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, 'User not found')
    if (!user.phone?.trim()) throw new ApiError(400, 'Add a phone number before verifying it')

    if (!user.phoneVerified) {
      user.phoneVerified = true
      await user.save()
      await recalculateTrust(user, { trigger: 'phone_verified' })
    }

    res.json({ message: 'Phone verified', phoneVerified: user.phoneVerified, trust: user.trust })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/users/moderation/:recordId/appeal  (Phase 12D.1 — UI + stub only) ─
// No admin review queue exists yet. This just records that an appeal was
// filed so the Trust Centre can reflect "Appeal Submitted" instead of
// re-submitting silently doing nothing.

exports.appealModeration = async (req, res, next) => {
  try {
    const { recordId } = req.params
    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, 'User not found')

    const record = user.moderationRecord?.id(recordId)
    if (!record) throw new ApiError(404, 'Moderation record not found')
    if (record.severity === 'minor') throw new ApiError(400, 'Minor moderation actions cannot be appealed')
    if (record.appealStatus === 'pending') throw new ApiError(400, 'An appeal is already pending for this action')

    record.appealStatus = 'pending'
    record.appealedAt = new Date()

    user.trustHistory = user.trustHistory || []
    user.trustHistory.unshift({
      type: 'appeal_submitted',
      description: 'Appeal submitted for a moderation decision',
      delta: 0,
      createdAt: new Date(),
    })

    await user.save()

    res.status(201).json({ message: 'Appeal submitted', moderationRecord: user.moderationRecord })
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
      Listing.find({ seller: userId, status: 'active', isHidden: { $ne: true } })
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

    // ── Public Trust Visibility (Phase 12D.1) ──────────────────────────────
    // Public profiles get ONLY: the trust badge, marketplace badges,
    // reputation summary, latest reviews, and dynamically-generated trust
    // reasons. Numeric score, five pillars, trust multiplier, moderation
    // history, and trust history are owner/admin-only and are deliberately
    // never placed on this response — see getProfile() for that surface.
    const trust = user.trust || {}
    const revealed = !!trust.revealed

    res.json({
      user: {
        _id:          user._id,
        name:         user.name,
        profileImage: user.profileImage,
        bio:          user.bio || '',
        location:     user.location || '',
        badges:       user.badges || [],
        trust: {
          revealed,
          publicBadge: trust.publicBadge ?? { emoji: '🟡', label: 'Building Trust', colorKey: 'yellow' },
          reasons:     trust.reasons ?? [],
        },
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

    // Never record a user viewing their own listing — Recently Viewed is a
    // buyer-side signal and should only ever reflect other people's listings.
    const listing = await Listing.findById(listingId).select('seller').lean()
    if (!listing || String(listing.seller) === String(req.user._id)) {
      return res.json({ ok: true })
    }

    const user = await User.findById(req.user._id).select('recentlyViewed')
    if (!user) return res.json({ ok: true })

    // Remove any previous occurrence, then prepend a fresh one — single
    // read-modify-write so the same listing never ends up duplicated.
    const deduped = user.recentlyViewed.filter(
      (v) => v.listing.toString() !== listingId
    )
    deduped.unshift({ listing: listingId, viewedAt: new Date() })
    user.recentlyViewed = deduped.slice(0, 10)

    await user.save()

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
        select:  'title price images category location status isHidden seller createdAt viewsCount',
        populate: { path: 'seller', select: 'name trust badges ghostRisk' },
      })
      .lean()

    if (!user) return res.json({ listings: [] })

    const listings = user.recentlyViewed
      .filter((v) =>
        v.listing &&
        v.listing.status !== 'removed' &&
        !v.listing.isHidden &&
        String(v.listing.seller?._id ?? v.listing.seller) !== String(req.user._id)
      )
      .map((v) => redactListingSeller({ ...v.listing, viewedAt: v.viewedAt }))

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
        populate: { path: 'seller', select: 'name profileImage trust' },
        options:  { sort: { createdAt: -1 } },
      })

    if (!user) throw new ApiError(404, 'User not found')

    const listings = (user.savedListings || [])
      .filter(Boolean)
      .filter((l) => l.status !== 'removed' && !l.isHidden)
      .map((l) => redactListingSeller(l.toObject ? l.toObject() : l))

    res.json({
      listings,
      savedListingIds: listings.map((l) => l._id.toString()),
    })
  } catch (err) {
    next(err)
  }
}
