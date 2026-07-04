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
