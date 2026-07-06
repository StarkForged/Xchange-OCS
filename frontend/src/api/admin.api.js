import adminApi from './adminAxios'

export const adminLoginAPI = (email, password) =>
  adminApi.post('/admin/login', { email, password }).then((r) => r.data)

export const getAdminStatsAPI = () =>
  adminApi.get('/admin/stats').then((r) => r.data)

export const getAdminChartDataAPI = () =>
  adminApi.get('/admin/charts').then((r) => r.data)

// ── Analytics Dashboard (Phase 12E) ──────────────────────────────────────────

export const getAnalyticsOverviewAPI     = () => adminApi.get('/admin/analytics/overview').then((r) => r.data)
export const getUserAnalyticsAPI         = () => adminApi.get('/admin/analytics/users').then((r) => r.data)
export const getListingAnalyticsAPI      = () => adminApi.get('/admin/analytics/listings').then((r) => r.data)
export const getTransactionAnalyticsAPI  = () => adminApi.get('/admin/analytics/transactions').then((r) => r.data)
export const getReviewAnalyticsAPI       = () => adminApi.get('/admin/analytics/reviews').then((r) => r.data)
export const getReportAnalyticsAPI       = () => adminApi.get('/admin/analytics/reports').then((r) => r.data)
export const getTrustAnalyticsAPI        = () => adminApi.get('/admin/analytics/trust').then((r) => r.data)
export const getMarketplaceHealthAPI     = () => adminApi.get('/admin/analytics/health').then((r) => r.data)
export const getActivityFeedAPI          = (limit = 20) => adminApi.get('/admin/analytics/activity', { params: { limit } }).then((r) => r.data)
export const getInsightsAPI              = () => adminApi.get('/admin/analytics/insights').then((r) => r.data)

// Triggers a browser download of the CSV — axios blob response, not JSON.
export const exportDataAPI = async (type) => {
  const res = await adminApi.get(`/admin/analytics/export/${type}`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${type}-export-${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const getAdminUsersAPI = (params = {}) =>
  adminApi.get('/admin/users', { params }).then((r) => r.data)

export const getAdminUserByIdAPI = (id) =>
  adminApi.get(`/admin/users/${id}`).then((r) => r.data)

export const adminUserActionAPI = (id, action) =>
  adminApi.patch(`/admin/users/${id}/action`, { action }).then((r) => r.data)

// ── Listings ──────────────────────────────────────────────────────────────────

export const getAdminListingsAPI = (params = {}) =>
  adminApi.get('/admin/listings', { params }).then((r) => r.data)

export const getAdminListingByIdAPI = (id) =>
  adminApi.get(`/admin/listings/${id}`).then((r) => r.data)

export const getAdminListingReportsAPI = (id) =>
  adminApi.get(`/admin/listings/${id}/reports`).then((r) => r.data)

export const dismissReportAPI = (reportId) =>
  adminApi.patch(`/admin/reports/${reportId}/dismiss`).then((r) => r.data)

export const hideListingAPI = (id, reason, note = '') =>
  adminApi.patch(`/admin/listings/${id}/hide`, { reason, note }).then((r) => r.data)

export const unhideListingAPI = (id) =>
  adminApi.patch(`/admin/listings/${id}/unhide`).then((r) => r.data)

export const removeListingAPI = (id, confirm, reason = '', severity = '') =>
  adminApi.delete(`/admin/listings/${id}`, { data: { confirm, reason, severity } }).then((r) => r.data)

export const restoreListingAPI = (id) =>
  adminApi.patch(`/admin/listings/${id}/restore`).then((r) => r.data)

export const featureListingAPI = (id, featured, featuredUntil = null, reason = '') =>
  adminApi.patch(`/admin/listings/${id}/feature`, { featured, featuredUntil, reason }).then((r) => r.data)

export const addAdminNoteAPI = (id, text) =>
  adminApi.post(`/admin/listings/${id}/notes`, { text }).then((r) => r.data)

// ── Reports (unified reporting engine — listings, users, and future targets) ──

export const getAdminReportsAPI = (params = {}) =>
  adminApi.get('/admin/reports', { params }).then((r) => r.data)

export const getAdminReportByIdAPI = (id) =>
  adminApi.get(`/admin/reports/${id}`).then((r) => r.data)

export const markReportUnderReviewAPI = (id) =>
  adminApi.patch(`/admin/reports/${id}/review`).then((r) => r.data)

export const requestMoreEvidenceAPI = (id, note = '') =>
  adminApi.patch(`/admin/reports/${id}/request-evidence`, { note }).then((r) => r.data)

export const resolveReportAPI = (id, resolution, falseReport = false) =>
  adminApi.patch(`/admin/reports/${id}/resolve`, { resolution, falseReport }).then((r) => r.data)

export const dismissAdminReportAPI = (id, resolution = '') =>
  adminApi.patch(`/admin/reports/${id}/dismiss`, { resolution }).then((r) => r.data)

export const markReportDuplicateAPI = (id, duplicateOfId) =>
  adminApi.patch(`/admin/reports/${id}/duplicate`, { duplicateOfId }).then((r) => r.data)

export const addReportNoteAPI = (id, text) =>
  adminApi.post(`/admin/reports/${id}/notes`, { text }).then((r) => r.data)
