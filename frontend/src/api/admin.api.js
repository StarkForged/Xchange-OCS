import adminApi from './adminAxios'

export const adminLoginAPI = (email, password) =>
  adminApi.post('/admin/login', { email, password }).then((r) => r.data)

export const getAdminStatsAPI = () =>
  adminApi.get('/admin/stats').then((r) => r.data)

export const getAdminChartDataAPI = () =>
  adminApi.get('/admin/charts').then((r) => r.data)

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

export const removeListingAPI = (id, confirm, reason = '') =>
  adminApi.delete(`/admin/listings/${id}`, { data: { confirm, reason } }).then((r) => r.data)

export const restoreListingAPI = (id) =>
  adminApi.patch(`/admin/listings/${id}/restore`).then((r) => r.data)

export const featureListingAPI = (id, featured, featuredUntil = null, reason = '') =>
  adminApi.patch(`/admin/listings/${id}/feature`, { featured, featuredUntil, reason }).then((r) => r.data)

export const addAdminNoteAPI = (id, text) =>
  adminApi.post(`/admin/listings/${id}/notes`, { text }).then((r) => r.data)
