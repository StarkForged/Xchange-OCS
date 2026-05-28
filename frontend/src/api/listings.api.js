import api from './axios'

// GET /api/listings?search=&category=&minPrice=&maxPrice=&sortBy=
export const getListingsAPI = async ({
  search   = '',
  category = 'all',
  minPrice = '',
  maxPrice = '',
  sortBy   = 'latest',
} = {}) => {
  const response = await api.get('/listings', {
    params: { search, category, minPrice, maxPrice, sortBy },
  })
  return response.data
}

// GET /api/listings/:id
export const getListingByIdAPI = async (id) => {
  const response = await api.get(`/listings/${id}`)
  return response.data
}

// POST /api/listings  (requires auth token)
export const createListingAPI = async (data) => {
  const response = await api.post('/listings', data)
  return response.data
}
