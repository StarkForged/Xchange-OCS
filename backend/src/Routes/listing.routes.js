const express = require('express')
const router  = express.Router()

const { getListings, getListingById, createListing } = require('../Controllers/listing.controller')
const { protect } = require('../Middleware/auth.middleware')

router.get('/',    getListings)
router.get('/:id', getListingById)
router.post('/',   protect, createListing)

module.exports = router
