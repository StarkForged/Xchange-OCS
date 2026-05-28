const User    = require('../Models/User')
const Listing = require('../Models/Listing')
const ApiError = require('../Utils/ApiError')

// Compute trust score from profile completeness + activity
const computeTrustScore = (user, listingCount) => {
  let score = 0
  if (user.name?.trim())                                         score += 10
  if (user.email?.trim())                                        score += 10
  if (user.phone?.trim())                                        score += 20
  if (user.bio?.trim())                                          score += 15
  if (user.location?.trim())                                     score += 10
  if (user.profileImage && user.profileImage.trim())             score += 15
  if (listingCount > 0)                                          score += 10
  const ageDays = Math.floor((Date.now() - new Date(user.createdAt)) / 86400000)
  if (ageDays >= 30)                                             score += 10
  return Math.min(score, 100)
}

// GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, 'User not found')

    const listingCount = await Listing.countDocuments({ seller: req.user._id })
    const trustScore   = computeTrustScore(user, listingCount)

    // Persist updated score if it changed
    if (user.trustScore !== trustScore) {
      user.trustScore = trustScore
      await user.save()
    }

    res.json({
      user: {
        _id:          user._id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        profileImage: user.profileImage,
        bio:          user.bio,
        phone:        user.phone,
        location:     user.location,
        trustScore,
        createdAt:    user.createdAt,
      },
      trustBreakdown: {
        name:         !!user.name?.trim(),
        email:        !!user.email?.trim(),
        phone:        !!user.phone?.trim(),
        bio:          !!user.bio?.trim(),
        location:     !!user.location?.trim(),
        profileImage: !!user.profileImage?.trim(),
        hasListings:  listingCount > 0,
        accountAge:   Math.floor((Date.now() - new Date(user.createdAt)) / 86400000) >= 30,
      },
    })
  } catch (err) {
    next(err)
  }
}

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, phone, location, profileImage } = req.body

    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, 'User not found')

    if (name?.trim())         user.name         = name.trim()
    if (bio    !== undefined)  user.bio          = bio.trim()
    if (phone  !== undefined)  user.phone        = phone.trim()
    if (location !== undefined) user.location    = location.trim()
    if (profileImage !== undefined) user.profileImage = profileImage

    const listingCount = await Listing.countDocuments({ seller: req.user._id })
    user.trustScore    = computeTrustScore(user, listingCount)

    await user.save()

    res.json({
      user: {
        _id:          user._id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        profileImage: user.profileImage,
        bio:          user.bio,
        phone:        user.phone,
        location:     user.location,
        trustScore:   user.trustScore,
        createdAt:    user.createdAt,
      },
    })
  } catch (err) {
    next(err)
  }
}
