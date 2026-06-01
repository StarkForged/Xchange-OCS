const express = require('express')
const router  = express.Router()

const {
  getProfile,
  updateProfile,
  getPublicProfile,
  toggleSavedListing,
  getSavedListings,
  trackView,
  getRecentlyViewed,
  addSearch,
  getSearches,
  clearSearches,
} = require('../Controllers/user.controller')
const { protect } = require('../Middleware/auth.middleware')

router.get('/profile',           protect, getProfile)
router.put('/profile',           protect, updateProfile)

// Saved / favourites
router.get('/saved',             protect, getSavedListings)
router.post('/saved/:listingId', protect, toggleSavedListing)

// Recently viewed
router.get('/viewed',             protect, getRecentlyViewed)
router.post('/viewed/:listingId', protect, trackView)

// Recent searches
router.get('/searches',           protect, getSearches)
router.post('/searches',          protect, addSearch)
router.delete('/searches',        protect, clearSearches)

// Public seller profile — must be LAST to avoid shadowing routes above
router.get('/:userId', getPublicProfile)

module.exports = router
