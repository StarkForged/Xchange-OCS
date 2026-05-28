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

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Not authorized, token invalid or expired'))
    }
    next(err)
  }
}
