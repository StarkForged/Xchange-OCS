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
  hideListing,
  unhideListing,
  removeListing,
  restoreListing,
  featureListing,
  addAdminNote,
} = require('../Controllers/adminListing.controller')
const {
  getAdminReports,
  getAdminReportById,
  markUnderReview,
  requestMoreEvidence,
  resolveReport,
  dismissReport,
  markAsDuplicate,
  addAdminNote: addReportAdminNote,
} = require('../Controllers/adminReport.controller')
const {
  getOverview,
  getUserAnalytics,
  getListingAnalytics,
  getTransactionAnalytics,
  getReviewAnalytics,
  getReportAnalytics,
  getTrustAnalytics,
  getHealth,
  getActivityFeed,
  getInsights,
  exportData,
} = require('../Controllers/analytics.controller')

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

router.get('/reports',                     getAdminReports)
router.get('/reports/:id',                 getAdminReportById)
router.patch('/reports/:id/review',        markUnderReview)
router.patch('/reports/:id/request-evidence', requestMoreEvidence)
router.patch('/reports/:id/resolve',       resolveReport)
router.patch('/reports/:id/dismiss',       dismissReport)
router.patch('/reports/:id/duplicate',     markAsDuplicate)
router.post('/reports/:id/notes',          addReportAdminNote)

// ── Analytics Dashboard (Phase 12E) ───────────────────────────────────────────
router.get('/analytics/overview',      getOverview)
router.get('/analytics/users',         getUserAnalytics)
router.get('/analytics/listings',      getListingAnalytics)
router.get('/analytics/transactions',  getTransactionAnalytics)
router.get('/analytics/reviews',       getReviewAnalytics)
router.get('/analytics/reports',       getReportAnalytics)
router.get('/analytics/trust',         getTrustAnalytics)
router.get('/analytics/health',        getHealth)
router.get('/analytics/activity',      getActivityFeed)
router.get('/analytics/insights',      getInsights)
router.get('/analytics/export/:type',  exportData)

module.exports = router
