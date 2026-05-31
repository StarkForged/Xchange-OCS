import api from './axios'

// GET /api/notifications — returns { notifications, unreadCount }
export const getNotificationsAPI = async () => {
  const res = await api.get('/notifications')
  return res.data
}

// PATCH /api/notifications/:id/read
export const markReadAPI = async (id) => {
  const res = await api.patch(`/notifications/${id}/read`)
  return res.data
}

// PATCH /api/notifications/read-all
export const markAllReadAPI = async () => {
  const res = await api.patch('/notifications/read-all')
  return res.data
}
