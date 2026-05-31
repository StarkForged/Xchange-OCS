const express = require('express')
const router  = express.Router()

const {
  getNotifications,
  markRead,
  markAllRead,
} = require('../Controllers/notification.controller')
const { protect } = require('../Middleware/auth.middleware')

router.get('/',                  protect, getNotifications)
router.patch('/read-all',        protect, markAllRead)      // static before :id
router.patch('/:id/read',        protect, markRead)

module.exports = router
