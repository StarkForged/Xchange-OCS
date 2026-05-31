import api from './axios'

// POST /api/users/saved/:listingId
export const toggleSavedListingAPI = async (listingId) => {
  const res = await api.post(`/users/saved/${listingId}`)
  return res.data
}

// GET /api/users/saved
export const getSavedListingsAPI = async () => {
  const res = await api.get('/users/saved')
  return res.data
}

// GET /api/users/:userId  — public seller profile (no auth required)
export const getPublicProfileAPI = async (userId) => {
  const res = await api.get(`/users/${userId}`)
  return res.data
}
