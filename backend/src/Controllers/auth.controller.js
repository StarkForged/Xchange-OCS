const User = require('../Models/User')
const ApiError = require('../Utils/ApiError')
const generateToken = require('../Utils/generateToken')
const { recalculateTrust } = require('../Services/trustEngine')

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage,
  trustScore: user.trustScore,
  createdAt: user.createdAt,
})

// POST /api/auth/register
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      throw new ApiError(400, 'Name, email and password are required')
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      throw new ApiError(409, 'Email already exists')
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role === 'admin' ? 'buyer' : (role || 'buyer'),
    })

    // Seed the Trust Framework state immediately (Identity pillar picks up
    // the default emailVerified=true right away instead of waiting for the
    // first profile fetch).
    await recalculateTrust(user, { trigger: 'account_created' })

    const token = generateToken(user._id)

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: sanitizeUser(user),
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/login
exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required')
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!user) {
      throw new ApiError(401, 'Invalid email or password')
    }

    if (user.role === 'admin') {
      throw new ApiError(403, 'Please use the Admin Portal.')
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password')
    }

    if (user.accountStatus === 'suspended') {
      throw new ApiError(403, 'Your account has been suspended. Please contact support.')
    }
    if (user.accountStatus === 'banned') {
      throw new ApiError(403, 'Your account has been permanently banned. Please contact support.')
    }

    const token = generateToken(user._id)

    res.status(200).json({
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    })
  } catch (err) {
    next(err)
  }
}
