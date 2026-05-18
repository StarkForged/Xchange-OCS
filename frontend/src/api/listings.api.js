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
        l.category.toLowerCase().includes(q)
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
