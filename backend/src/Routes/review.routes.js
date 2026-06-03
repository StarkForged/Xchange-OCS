const express = require('express')
const router  = express.Router()

const {
  createReview,
  getMyReviews,
  getUserReviews,
  getListingReviews,
  getReviewStats,
} = require('../Controllers/review.controller')
const { protect } = require('../Middleware/auth.middleware')

router.post('/',                  protect, createReview)
router.get('/me',                 protect, getMyReviews)
router.get('/stats/:userId',      getReviewStats)
router.get('/user/:userId',       getUserReviews)
router.get('/listing/:listingId', getListingReviews)

module.exports = router
