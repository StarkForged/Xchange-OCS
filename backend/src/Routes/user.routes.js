const express = require('express')
const router  = express.Router()

const { getProfile, updateProfile } = require('../Controllers/user.controller')
const { protect } = require('../Middleware/auth.middleware')

router.get('/profile',  protect, getProfile)
router.put('/profile',  protect, updateProfile)

module.exports = router
