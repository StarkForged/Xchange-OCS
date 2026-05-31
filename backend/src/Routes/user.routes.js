const express = require('express')
const router  = express.Router()

const {
  getProfile,
  updateProfile,
  getPublicProfile,
  toggleSavedListing,
  getSavedListings,
} = require('../Controllers/user.controller')
const { protect } = require('../Middleware/auth.middleware')

router.get('/profile',           protect, getProfile)
router.put('/profile',           protect, updateProfile)

// Saved / favourites
router.get('/saved',             protect, getSavedListings)
router.post('/saved/:listingId', protect, toggleSavedListing)

// Public seller profile — used by listing detail page
// Must be last to avoid shadowing /profile and /saved
router.get('/:userId',                    getPublicProfile)

module.exports = router
