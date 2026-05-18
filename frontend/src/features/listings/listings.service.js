import { getListingsAPI, getListingByIdAPI, createListingAPI } from '../../api/listings.api'

export const getListings = async (filters = {}) => {
  const response = await getListingsAPI(filters)
  return response.listings
}

export const getListingById = async (id) => {
  const response = await getListingByIdAPI(id)
  return response.listing
}

export const createListing = async (data) => {
  const response = await createListingAPI(data)
  return response.listing
}
