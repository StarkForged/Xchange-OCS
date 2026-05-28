import { useEffect, useState } from 'react'
import ListingCard from '../../components/listings/ListingCard'
import { getListings } from '../../features/listings/listings.service'
import { categories } from '../../mock/categories'

const inputCls =
  'border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition'

export default function ListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('latest')

  const hasActiveFilters = minPrice || maxPrice || sortBy !== 'latest'
  const hasAnyFilter = search || category !== 'all' || hasActiveFilters

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setCategory('all')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('latest')
  }

  // Debounce search — 400ms delay before triggering API call
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch with stale-request guard — prevents older response overwriting newer one
  useEffect(() => {
    let cancelled = false

    const fetchListings = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getListings({ search: debouncedSearch, category, minPrice, maxPrice, sortBy })
        if (!cancelled) setListings(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          setError('Something went wrong while fetching listings')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchListings()
    return () => { cancelled = true }
  }, [debouncedSearch, category, minPrice, maxPrice, sortBy])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Page Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Browse Listings</h1>
          <p className="text-sm text-gray-400 mt-1">
            {loading
              ? 'Loading...'
              : `${listings.length} listing${listings.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Search Row */}
        <div className="flex gap-2 mb-2">

          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-gray-400 pointer-events-none text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value.trimStart())}
              className="w-full border border-gray-200 bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
            />
          </div>

          {/* Category Dropdown */}
          <select
            disabled={loading}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border shadow-sm transition ${
              showFilters || hasActiveFilters
                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M10 12h4" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
            )}
          </button>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4 mb-2 flex flex-wrap gap-4 items-end">

            {/* Price Range */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Min Price (₹)</label>
              <input
                type="number"
                disabled={loading}
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className={`${inputCls} w-32`}
                min={0}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Max Price (₹)</label>
              <input
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className={`${inputCls} w-32`}
                min={0}
              />
            </div>

            <div className="hidden sm:block self-stretch w-px bg-gray-100" />

            {/* Sort */}
            <div className="flex flex-col gap-1.5 min-w-[170px]">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort By</label>
              <select
                disabled={loading}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`${inputCls} w-full`}
              >
                <option value="latest">Latest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

          </div>
        )}

        {/* Clear filters link */}
        {hasAnyFilter && (
          <div className="flex justify-end mb-5">
            <button
              onClick={clearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

        {!hasAnyFilter && <div className="mb-5" />}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm">Loading listings...</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        )}

        {/* Empty */}
        {!loading && !error && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-700 font-semibold text-base mb-1">No listings found</p>
            <p className="text-gray-400 text-sm mb-5">Try adjusting your search or filters</p>
            {hasAnyFilter && (
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && !error && listings.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
