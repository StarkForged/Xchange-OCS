const express = require('express')
const router  = express.Router()

const { getListings, getListingById, createListing } = require('../Controllers/listing.controller')
const { protect } = require('../Middleware/auth.middleware')
const upload    = require('../Middleware/upload.middleware')

router.get('/',    getListings)
router.get('/:id', getListingById)
router.post('/',   protect, upload.array('images', 5), createListing)

module.exports = router
