import api from './axios'

// ── View tracking ─────────────────────────────────────────────────────────────

export const trackViewAPI = (listingId) =>
  api.post(`/users/viewed/${listingId}`).catch(() => {})   // fire-and-forget, never throws

export const getRecentlyViewedAPI = () =>
  api.get('/users/viewed').then((r) => r.data)

// ── Search history ────────────────────────────────────────────────────────────

export const addSearchAPI = (query) =>
  api.post('/users/searches', { query }).catch(() => {})   // fire-and-forget

export const getSearchesAPI = () =>
  api.get('/users/searches').then((r) => r.data)

export const clearSearchesAPI = () =>
  api.delete('/users/searches').then((r) => r.data)

// ── Listings intelligence ─────────────────────────────────────────────────────

export const getSimilarListingsAPI = (listingId) =>
  api.get(`/listings/similar/${listingId}`).then((r) => r.data)

export const getRecommendedAPI = () =>
  api.get('/listings/recommended').then((r) => r.data)
