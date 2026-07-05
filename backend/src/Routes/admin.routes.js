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
const {
  getAdminListings,
  getAdminListingById,
  getListingReports,
  dismissReport,
  hideListing,
  unhideListing,
  removeListing,
  restoreListing,
  featureListing,
  addAdminNote,
} = require('../Controllers/adminListing.controller')

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

router.get('/listings',                    getAdminListings)
router.get('/listings/:id',                getAdminListingById)
router.get('/listings/:id/reports',        getListingReports)
router.patch('/listings/:id/hide',         hideListing)
router.patch('/listings/:id/unhide',       unhideListing)
router.patch('/listings/:id/feature',      featureListing)
router.patch('/listings/:id/restore',      restoreListing)
router.post('/listings/:id/notes',         addAdminNote)
router.delete('/listings/:id',             removeListing)
router.patch('/reports/:reportId/dismiss', dismissReport)

module.exports = router
