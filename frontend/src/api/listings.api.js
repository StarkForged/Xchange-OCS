import { mockListings } from '../mock/listings'

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

// GET /api/listings?search=&category=
export const getListingsAPI = async ({ search = '', category = 'all' } = {}) => {
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
