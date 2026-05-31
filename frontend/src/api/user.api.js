import api from './axios'

// POST /api/users/saved/:listingId
// Toggles saved state. Returns { saved: boolean, savedListingIds: string[] }
export const toggleSavedListingAPI = async (listingId) => {
  const res = await api.post(`/users/saved/${listingId}`)
  return res.data
}

// GET /api/users/saved
// Returns { listings: Listing[], savedListingIds: string[] }
export const getSavedListingsAPI = async () => {
  const res = await api.get('/users/saved')
  return res.data
}
