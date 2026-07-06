const express = require('express')
const router  = express.Router()

const {
  createReport,
  getReportStatus,
  getMyReports,
  getMyReportById,
  submitAdditionalEvidence,
} = require('../Controllers/report.controller')
const { protect } = require('../Middleware/auth.middleware')
const reportUpload = require('../Middleware/reportUpload.middleware')

router.use(protect)

router.get('/status',              getReportStatus)
router.get('/mine',                getMyReports)
router.get('/mine/:id',            getMyReportById)
router.post('/',                   reportUpload.array('attachments', 5), createReport)
router.post('/mine/:id/evidence',  reportUpload.array('attachments', 5), submitAdditionalEvidence)

module.exports = router
