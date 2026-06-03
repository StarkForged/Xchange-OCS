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

// GET /api/listings/mine  (requires auth)
export const getMyListingsAPI = async () => {
  const response = await api.get('/listings/mine')
  return response.data
}

// PATCH /api/listings/:id/status  (requires auth)
export const updateListingStatusAPI = async (id, status, buyerId = null) => {
  const response = await api.patch(`/listings/${id}/status`, { status, buyerId })
  return response.data
}

// GET /api/listings/:id/chat-participants  (requires auth, owner only)
export const getChatParticipantsAPI = async (id) => {
  const res = await api.get(`/listings/${id}/chat-participants`)
  return res.data
}

// PATCH /api/listings/:id/transaction/confirm  (requires auth)
export const confirmTransactionAPI = async (id) => {
  const res = await api.patch(`/listings/${id}/transaction/confirm`)
  return res.data
}

// PATCH /api/listings/:id/transaction/cancel  (requires auth)
export const cancelTransactionAPI = async (id, reason = '') => {
  const res = await api.patch(`/listings/${id}/transaction/cancel`, { reason })
  return res.data
}

// POST /api/listings  — sends multipart/form-data so multer can parse files
export const createListingAPI = async (data) => {
  const formData = new FormData()

  formData.append('title',       data.title)
  formData.append('description', data.description || '')
  formData.append('condition',   data.condition   || 'good')
  formData.append('status',      data.status      || 'active')

  // Objects must be JSON-stringified; the controller parses them back
  formData.append('price',      JSON.stringify(data.price))
  formData.append('category',   JSON.stringify(data.category))
  formData.append('location',   JSON.stringify(data.location   || {}))
  formData.append('attributes', JSON.stringify(data.attributes || {}))

  // Append each File object under the same 'images' key
  if (data.images?.length > 0) {
    data.images.forEach((file) => formData.append('images', file))
  }

  // Setting Content-Type to undefined removes the axios default
  // 'application/json' so the browser sets 'multipart/form-data; boundary=...'
  const response = await api.post('/listings', formData, {
    headers: { 'Content-Type': undefined },
  })
  return response.data
}
