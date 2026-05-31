import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, RefreshCw } from 'lucide-react'
import { getSavedListingsAPI } from '../../api/user.api'
import useAuthStore from '../../store/auth.Store'
import ListingCard from '../../components/listings/ListingCard'

// ── Skeleton ───────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4 space-y-2.5">
        <div className="h-3.5 bg-gray-100 rounded-lg w-3/4" />
        <div className="h-5 bg-gray-100 rounded-lg w-1/3" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SavedListingsPage() {
  const { savedListingIds, setSavedListingIds } = useAuthStore()

  const [allListings, setAllListings] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  // Fetch the full populated listing objects from the server.
  // After fetching, also sync the store's ID list with the server truth
  // (handles the case where a listing was deleted since the IDs were last cached).
  const fetchSaved = async () => {
    setLoading(true)
    setError(null)
    try {
      const { listings, savedListingIds: serverIds } = await getSavedListingsAPI()
      setAllListings(listings || [])
      setSavedListingIds(serverIds || [])
    } catch (err) {
      setError(err?.message || 'Failed to load saved listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSaved() }, []) // eslint-disable-line

  // Reactively filter: when the user un-saves a listing via the heart button
  // in a ListingCard, savedListingIds in the store updates and this derived
  // list automatically removes the listing without a refetch.
  const listings = allListings.filter(l => savedListingIds.includes(l._id))

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Saved Listings</h1>
          <p className="text-sm text-gray-400 mt-1">Your wishlist — items you've saved for later</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Saved Listings</h1>
          <p className="text-sm text-gray-400 mt-1">Your wishlist — items you've saved for later</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 py-16 text-center">
          <p className="text-sm font-semibold text-red-600 mb-1">Failed to load saved listings</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchSaved}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (listings.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Saved Listings</h1>
          <p className="text-sm text-gray-400 mt-1">Your wishlist — items you've saved for later</p>
        </div>

        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-24 text-center">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
            <div className="absolute inset-0 bg-rose-50 rounded-2xl rotate-6" />
            <div className="absolute inset-0 bg-rose-100 rounded-2xl -rotate-3" />
            <div className="relative w-full h-full bg-white rounded-2xl border border-rose-100 flex items-center justify-center shadow-sm">
              <Heart className="w-9 h-9 text-rose-400" strokeWidth={1.5} />
            </div>
          </div>

          <p className="text-base font-bold text-gray-800 mb-1.5">Your wishlist is empty</p>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto leading-relaxed">
            Browse the marketplace and tap the heart icon on any listing to save it here.
          </p>

          <Link
            to="/listings"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Browse Marketplace
          </Link>
        </div>
      </div>
    )
  }

  // ── Listings grid ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Saved Listings</h1>
          <p className="text-sm text-gray-400 mt-1">
            {listings.length} saved {listings.length === 1 ? 'listing' : 'listings'}
          </p>
        </div>
        <button
          onClick={fetchSaved}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {listings.map(listing => (
          <ListingCard key={listing._id} listing={listing} />
        ))}
      </div>
    </div>
  )
}
