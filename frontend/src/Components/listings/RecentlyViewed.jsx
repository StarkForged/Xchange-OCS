import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRecentlyViewedAPI } from '../../api/intelligence.api'
import useAuthStore from '../../store/auth.Store'
import defaultImage from '../../assets/images/products/iphone13.jpg'

const fmtPrice = (p) => p?.amount != null ? `₹${p.amount.toLocaleString('en-IN')}` : '—'

const timeAgo = (d) => {
  if (!d) return ''
  const h = Math.floor((Date.now() - new Date(d)) / 3_600_000)
  if (h < 1)   return 'Just now'
  if (h < 24)  return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

export default function RecentlyViewed({ maxItems = 6, compact = false }) {
  const { isAuthenticated } = useAuthStore()
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return }
    let cancelled = false
    getRecentlyViewedAPI()
      .then(({ listings: data }) => { if (!cancelled) setListings(data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isAuthenticated])

  if (!isAuthenticated || (!loading && !listings.length)) return null

  const display = listings.slice(0, maxItems)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recently Viewed
        </h3>
        <Link to="/listings" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
          Browse more →
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-36 animate-pulse">
              <div className="aspect-[4/3] bg-gray-100 rounded-xl mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {display.map((listing) => (
            <Link
              key={listing._id}
              to={`/listings/${listing._id}`}
              className="group flex-shrink-0 w-36 sm:w-40"
            >
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-2 relative">
                <img
                  src={listing.images?.[0] || defaultImage}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
                />
                {listing.status === 'sold' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full uppercase tracking-wider">Sold</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold text-gray-800 line-clamp-1 leading-snug">{listing.title}</p>
              <p className="text-sm font-black text-indigo-600 mt-0.5">{fmtPrice(listing.price)}</p>
              {!compact && listing.viewedAt && (
                <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(listing.viewedAt)}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
