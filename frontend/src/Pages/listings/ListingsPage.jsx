import { useEffect, useState } from 'react'
import ListingCard from '../../components/listings/ListingCard'
import { getListings } from '../../features/listings/listings.service'

export default function ListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await getListings()
        setListings(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        setError('Something went wrong while fetching listings')
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [])

  // ⏳ Loading state
  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading listings...
      </div>
    )
  }

  // ❌ Error state
  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        {error}
      </div>
    )
  }

  // 📭 Empty state
  if (!listings.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        No listings found
      </div>
    )
  }

  // ✅ Main UI
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Listings</h1>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard
            key={listing._id}   // ✅ fixes key warning
            listing={listing}
          />
        ))}
      </div>
    </div>
  )
}