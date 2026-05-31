const express = require('express')
const router  = express.Router()

const {
  getProfile,
  updateProfile,
  toggleSavedListing,
  getSavedListings,
} = require('../Controllers/user.controller')
const { protect } = require('../Middleware/auth.middleware')

router.get('/profile',              protect, getProfile)
router.put('/profile',              protect, updateProfile)

// Saved / favourites
router.get('/saved',                protect, getSavedListings)
router.post('/saved/:listingId',    protect, toggleSavedListing)

module.exports = router
