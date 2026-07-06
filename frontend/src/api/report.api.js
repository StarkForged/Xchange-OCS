import api from './axios'

// POST /api/reports  (multipart)
export const createReportAPI = (formData, onUploadProgress) =>
  api.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  }).then((r) => r.data)

// GET /api/reports/status?reportType=&listingId=&reportedUserId=
export const getReportStatusAPI = (params) =>
  api.get('/reports/status', { params }).then((r) => r.data)

// GET /api/reports/mine
export const getMyReportsAPI = () =>
  api.get('/reports/mine').then((r) => r.data)

// GET /api/reports/mine/:id
export const getMyReportByIdAPI = (id) =>
  api.get(`/reports/mine/${id}`).then((r) => r.data)

// POST /api/reports/mine/:id/evidence  (multipart)
export const submitAdditionalEvidenceAPI = (id, formData) =>
  api.post(`/reports/mine/${id}/evidence`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
