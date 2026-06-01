import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSimilarListingsAPI } from '../../api/intelligence.api'
import defaultImage from '../../assets/images/products/iphone13.jpg'

const fmtPrice = (p) => p?.amount != null ? `₹${p.amount.toLocaleString('en-IN')}` : '—'

function SimilarCard({ listing }) {
  const img  = listing.images?.[0] || defaultImage
  const tier = (listing.seller?.trustScore ?? 0) >= 80 ? 'Trusted'
             : (listing.seller?.trustScore ?? 0) >= 50 ? 'Building' : null

  return (
    <Link
      to={`/listings/${listing._id}`}
      className="group flex gap-3 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md p-3 transition-all duration-200"
    >
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        <img
          src={img}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{listing.title}</p>
        <div className="space-y-0.5 mt-1">
          <p className="text-sm font-black text-indigo-600">{fmtPrice(listing.price)}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {listing.location?.city && (
              <span className="text-[10px] text-gray-400">{listing.location.city}</span>
            )}
            {tier && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                tier === 'Trusted'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {tier}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function SimilarListings({ listingId }) {
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!listingId) return
    let cancelled = false
    getSimilarListingsAPI(listingId)
      .then(({ listings: data }) => { if (!cancelled) setListings(data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [listingId])

  if (!loading && !listings.length) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
        Similar Listings
      </h3>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl border border-gray-100 animate-pulse">
              <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {listings.map((l) => <SimilarCard key={l._id} listing={l} />)}
        </div>
      )}
    </div>
  )
}
