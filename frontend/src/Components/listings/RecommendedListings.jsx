import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRecommendedAPI } from '../../api/intelligence.api'
import useAuthStore from '../../store/auth.Store'
import ListingCard from './ListingCard'

export default function RecommendedListings({ maxItems = 4, label = 'Recommended for You' }) {
  const { isAuthenticated } = useAuthStore()
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return }
    let cancelled = false
    getRecommendedAPI()
      .then(({ listings: data }) => { if (!cancelled) setListings(data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isAuthenticated])

  if (!isAuthenticated || (!loading && !listings.length)) return null

  const display = listings.slice(0, maxItems)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Personalized</p>
          <h3 className="text-base font-bold text-gray-900">{label}</h3>
        </div>
        <Link to="/listings" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors flex items-center gap-1">
          View all
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: maxItems }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-100" />
              <div className="p-3.5 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {display.map((listing) => (
            <ListingCard key={listing._id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
