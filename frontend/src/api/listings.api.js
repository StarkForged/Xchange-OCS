import { mockListings } from '../mock/listings'

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

// GET /api/listings?search=&category=&minPrice=&maxPrice=&sortBy=
export const getListingsAPI = async ({
  search = '',
  category = 'all',
  minPrice = '',
  maxPrice = '',
  sortBy = 'latest',
} = {}) => {
  await delay(500)

  let results = [...mockListings]

  if (category && category !== 'all') {
    results = results.filter((l) => l.category?.id === category)
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    results = results.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.category?.name?.toLowerCase().includes(q)
    )
  }

  const min = minPrice !== '' ? Number(minPrice) : null
  const max = maxPrice !== '' ? Number(maxPrice) : null

  if (min !== null && !isNaN(min)) {
    results = results.filter((l) => (l.price?.amount ?? 0) >= min)
  }

  if (max !== null && !isNaN(max)) {
    results = results.filter((l) => (l.price?.amount ?? 0) <= max)
  }

  if (sortBy === 'price_asc') {
  results = [...results].sort(
    (a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0)
  )
} else if (sortBy === 'price_desc') {
  results = [...results].sort(
    (a, b) => (b.price?.amount ?? 0) - (a.price?.amount ?? 0)
  )
} else {
  results = [...results].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
}

  return { listings: results }
}

// GET /api/listings/:id
export const getListingByIdAPI = async (id) => {
  await delay(300)

  const listing = mockListings.find((l) => l._id === id)
  if (!listing) throw { message: 'Listing not found', status: 404 }

  return { listing }
}

// POST /api/listings
export const createListingAPI = async (data) => {
  await delay(500)

  const newListing = {
    ...data,
    _id: `listing_${Date.now()}`,
    status: 'active',
    viewsCount: 0,
    favoritesCount: 0,
    createdAt: new Date().toISOString(),
  }

  mockListings.push(newListing)
  return { listing: newListing }
}
