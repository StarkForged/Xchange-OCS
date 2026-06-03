import api from './axios'

// POST /api/reviews
export const createReviewAPI = async ({ listingId, rating, comment }) => {
  const res = await api.post('/reviews', { listingId, rating, comment })
  return res.data
}

// GET /api/reviews/me
export const getMyReviewsAPI = async () => {
  const res = await api.get('/reviews/me')
  return res.data
}

// GET /api/reviews/user/:userId
export const getUserReviewsAPI = async (userId) => {
  const res = await api.get(`/reviews/user/${userId}`)
  return res.data
}

// GET /api/reviews/listing/:listingId
export const getListingReviewsAPI = async (listingId) => {
  const res = await api.get(`/reviews/listing/${listingId}`)
  return res.data
}

// GET /api/reviews/stats/:userId
export const getReviewStatsAPI = async (userId) => {
  const res = await api.get(`/reviews/stats/${userId}`)
  return res.data
}
