const multer = require('multer')

const storage = multer.memoryStorage()

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only JPG, PNG, WEBP, or PDF files are allowed'), false)
  }
}

// Report evidence: up to 5 files, 10MB each (screenshots + PDFs).
const reportUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
})

module.exports = reportUpload
