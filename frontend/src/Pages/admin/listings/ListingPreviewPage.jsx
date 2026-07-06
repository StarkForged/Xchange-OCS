import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAdminListingByIdAPI } from '../../../api/admin.api'
import { NO_IMAGE_PLACEHOLDER as defaultImage } from '../../../constants/placeholderImage'

const formatPrice = (p) => (p?.amount != null ? `₹${p.amount.toLocaleString('en-IN')}` : '—')

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatAttributeKey = (key) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())

// Read-only, admin-authenticated rendering of a listing exactly as a buyer
// would see it on the marketplace. Deliberately does NOT reuse the buyer
// `/listings/:id` route — that route sits behind the buyer/seller
// ProtectedRoute guard and would bounce an admin-only session to /login.
// This page stays inside the admin auth boundary end-to-end.
export default function AdminListingPreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [activeImage, setActiveImage] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminListingByIdAPI(id)
      setListing(data.listing)
      setActiveImage(0)
    } catch (e) {
      setError(e.message || 'Failed to load listing')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="h-96 bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-sm text-red-400">{error || 'Listing not found'}</p>
        <button onClick={() => navigate(`/admin/listings/${id}`)} className="mt-3 text-xs text-indigo-400 hover:underline">
          ← Back to admin listing
        </button>
      </div>
    )
  }

  const images = listing.images?.length > 0 ? listing.images : [defaultImage]
  const hasAttributes = listing.attributes && Object.keys(listing.attributes).length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      {/* Admin preview banner — makes it unmistakable this isn't the live buyer page */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5 text-indigo-300">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <p className="text-xs font-semibold">Admin Preview — read-only, exactly as buyers see it</p>
        </div>
        <button
          onClick={() => navigate(`/admin/listings/${id}`)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors flex-shrink-0"
        >
          ← Back to Admin Listing
        </button>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {/* Images */}
        <div className="aspect-video bg-gray-100">
          <img src={images[activeImage]} alt="" className="w-full h-full object-cover" />
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-5 pt-3">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === activeImage ? 'border-indigo-500' : 'border-transparent'}`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-5 space-y-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{listing.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {[listing.location?.area, listing.location?.city, listing.location?.state].filter(Boolean).join(', ')}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-black text-indigo-600">{formatPrice(listing.price)}</span>
            {listing.price?.negotiable && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Negotiable</span>
            )}
            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{listing.category?.name}</span>
            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{listing.condition?.replace('_', ' ')}</span>
          </div>

          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {hasAttributes && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Product Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(listing.attributes).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{formatAttributeKey(key)}</p>
                    <p className="text-sm font-semibold text-gray-800">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">{listing.seller?.name?.[0]?.toUpperCase() || '?'}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{listing.seller?.name || 'Unknown seller'}</p>
              <p className="text-xs text-gray-400">Listed on {formatDate(listing.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
