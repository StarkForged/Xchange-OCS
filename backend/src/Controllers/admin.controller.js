const jwt      = require('jsonwebtoken')
const User     = require('../Models/User')
const Listing  = require('../Models/Listing')
const Review   = require('../Models/Review')
const ApiError = require('../Utils/ApiError')

// ── POST /api/admin/login ─────────────────────────────────────────────────────
// Admin-only login. Rejects non-admin roles with 403.

exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) throw new ApiError(400, 'Email and password are required')

    const user = await User.findOne({ email }).select('+password')
    if (!user) throw new ApiError(401, 'Invalid credentials')

    if (user.role !== 'admin') {
      throw new ApiError(403, 'Access denied. Admin accounts only.')
    }

    const match = await user.matchPassword(password)
    if (!match) throw new ApiError(401, 'Invalid credentials')

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    })

    const safe = {
      _id:     user._id,
      name:    user.name,
      email:   user.email,
      role:    user.role,
      profileImage: user.profileImage,
    }

    res.json({ token, user: safe })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/stats ──────────────────────────────────────────────────────

exports.getStats = async (req, res, next) => {
  try {
    const [
      totalUsers, buyers, sellers, admins,
      totalListings, activeListings, pausedListings, soldListings,
      totalReviews, reviewAgg,
      avgTrustAgg,
      completedDeals, cancelledDeals,
      suspendedUsers, bannedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'seller' }),
      User.countDocuments({ role: 'admin' }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'active' }),
      Listing.countDocuments({ status: 'paused' }),
      Listing.countDocuments({ status: 'sold' }),
      Review.countDocuments(),
      Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
      User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        { $group: { _id: null, avg: { $avg: '$trustScore' } } },
      ]),
      Listing.countDocuments({ 'transaction.completedAt': { $ne: null } }),
      Listing.countDocuments({ 'transaction.cancelled': true }),
      User.countDocuments({ accountStatus: 'suspended' }),
      User.countDocuments({ accountStatus: 'banned' }),
    ])

    res.json({
      users: { total: totalUsers, buyers, sellers, admins, suspended: suspendedUsers, banned: bannedUsers },
      listings: { total: totalListings, active: activeListings, paused: pausedListings, sold: soldListings },
      transactions: { completed: completedDeals, cancelled: cancelledDeals },
      reviews: {
        total: totalReviews,
        averageRating: reviewAgg[0]?.avg ? Math.round(reviewAgg[0].avg * 10) / 10 : 0,
      },
      avgTrustScore: avgTrustAgg[0]?.avg ? Math.round(avgTrustAgg[0].avg) : 0,
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/charts ─────────────────────────────────────────────────────

exports.getChartData = async (req, res, next) => {
  try {
    const days  = 30
    const since = new Date()
    since.setDate(since.getDate() - days)
    const fmt = '%Y-%m-%d'

    const [newUsers, newListings, newTransactions, roleDistribution] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Listing.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Listing.aggregate([
        { $match: { 'transaction.completedAt': { $gte: since, $ne: null } } },
        { $group: { _id: { $dateToString: { format: fmt, date: '$transaction.completedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { role: { $ne: 'admin' } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ])

    // Fill sparse data — every day in the window gets an entry (0 if no activity)
    const fillDays = (data) => {
      const map = {}
      data.forEach((d) => { map[d._id] = d.count })
      const result = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        result.push({ date: key, count: map[key] || 0 })
      }
      return result
    }

    res.json({
      newUsers:        fillDays(newUsers),
      newListings:     fillDays(newListings),
      newTransactions: fillDays(newTransactions),
      roleDistribution: roleDistribution.map((r) => ({
        name:  r._id === 'buyer' ? 'Buyers' : 'Sellers',
        value: r.count,
      })),
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────

exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, status, verified, ghost } = req.query

    const query = {}

    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    if (role)   query.role = role
    if (status) query.accountStatus = status
    if (verified === 'true')  query.isVerifiedSeller = true
    if (verified === 'false') query.isVerifiedSeller = false
    if (ghost === 'true') query['ghostRisk.flagged'] = true

    const skip = (Number(page) - 1) * Number(limit)

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -savedListings -recentlyViewed -recentSearches -badges')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ])

    res.json({
      users,
      pagination: {
        page:  Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -savedListings -recentlyViewed -recentSearches')
      .lean()

    if (!user) throw new ApiError(404, 'User not found')

    const [listingCount, reviewCount, reviewStats] = await Promise.all([
      Listing.countDocuments({ seller: user._id }),
      Review.countDocuments({ reviewee: user._id }),
      Review.aggregate([
        { $match: { reviewee: user._id } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ])

    res.json({
      user: {
        ...user,
        _meta: {
          listingCount,
          reviewCount,
          averageRating: reviewStats[0]?.avg ? Math.round(reviewStats[0].avg * 10) / 10 : 0,
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/admin/users/:id/action ────────────────────────────────────────
// action: suspend | activate | ban | verify | unverify

exports.updateUserAction = async (req, res, next) => {
  try {
    const { action } = req.body
    const VALID = ['suspend', 'activate', 'ban', 'verify', 'unverify']
    if (!VALID.includes(action)) throw new ApiError(400, `Invalid action. Must be one of: ${VALID.join(', ')}`)

    const user = await User.findById(req.params.id)
    if (!user) throw new ApiError(404, 'User not found')

    // Prevent action on other admins
    if (user.role === 'admin') throw new ApiError(403, 'Cannot perform actions on admin accounts')

    switch (action) {
      case 'suspend':
        user.accountStatus = 'suspended'
        // Hide all active listings from the public marketplace
        await Listing.updateMany({ seller: user._id, status: 'active' }, { $set: { status: 'paused' } })
        break
      case 'ban':
        user.accountStatus = 'banned'
        await Listing.updateMany({ seller: user._id, status: 'active' }, { $set: { status: 'paused' } })
        break
      case 'activate':
        user.accountStatus = 'active'
        // Restore all paused listings when account is reinstated
        await Listing.updateMany({ seller: user._id, status: 'paused' }, { $set: { status: 'active' } })
        break
      case 'verify':
        if (user.role !== 'seller') throw new ApiError(400, 'Only sellers can be verified')
        user.isVerifiedSeller = true
        break
      case 'unverify':
        user.isVerifiedSeller = false
        break
    }

    await user.save()

    res.json({
      message: `Action "${action}" applied successfully`,
      user: {
        _id:              user._id,
        name:             user.name,
        email:            user.email,
        role:             user.role,
        accountStatus:    user.accountStatus,
        isVerifiedSeller: user.isVerifiedSeller,
      },
    })
  } catch (err) {
    next(err)
  }
}
