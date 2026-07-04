const express = require('express')
const { protect, requireAdmin } = require('../Middleware/auth.middleware')
const {
  adminLogin,
  getStats,
  getChartData,
  getUsers,
  getUserById,
  updateUserAction,
} = require('../Controllers/admin.controller')

const router = express.Router()

// Public admin auth
router.post('/login', adminLogin)

// All routes below require a valid JWT *and* role === 'admin'
router.use(protect, requireAdmin)

router.get('/stats',            getStats)
router.get('/charts',           getChartData)
router.get('/users',            getUsers)
router.get('/users/:id',        getUserById)
router.patch('/users/:id/action', updateUserAction)

module.exports = router
