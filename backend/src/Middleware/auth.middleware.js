const jwt = require('jsonwebtoken')
const User = require('../Models/User')
const ApiError = require('../Utils/ApiError')

exports.protect = async (req, res, next) => {
  try {
    let token
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, token missing')
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user) {
      throw new ApiError(401, 'Not authorized, user not found')
    }

    if (user.accountStatus === 'suspended') {
      throw new ApiError(403, 'Your account has been suspended. Contact support.')
    }
    if (user.accountStatus === 'banned') {
      throw new ApiError(403, 'Your account has been banned.')
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Not authorized, token invalid or expired'))
    }
    next(err)
  }
}

exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'))
  }
  next()
}

