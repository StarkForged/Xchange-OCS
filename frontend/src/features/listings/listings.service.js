import { getListingsAPI, getListingByIdAPI } from '../../api/listings.api'

export const getListings = async (filters = {}) => {
  const response = await getListingsAPI(filters)
  return response.listings
}

export const getListingById = async (id) => {
  const response = await getListingByIdAPI(id)
  return response.listing
}
