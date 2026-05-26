import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getListingById } from '../../features/listings/listings.service'
import defaultAvatar from '../../assets/images/default-avatar.jpg'
import defaultImage from '../../assets/images/products/iphone13.jpg'

const formatPrice = (price) =>
  '₹' + (price?.amount?.toLocaleString('en-IN') ?? '0')

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

const formatSellerName = (seller) => {
  if (typeof seller !== 'string') return 'Unknown Seller'
  const num = seller.replace('user_', '')
  return `Seller #${num}`
}

const formatAttributeKey = (key) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())

export default function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeImage, setActiveImage] = useState(0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchListing = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getListingById(id)
        if (!cancelled) {
          setListing(data)
          setActiveImage(0)
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Listing not found')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchListing()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading listing...</span>
        </div>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-700 font-semibold text-base mb-2">
            {error || 'Listing not found'}
          </p>
          <button
            onClick={() => navigate('/listings')}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            ← Back to Listings
          </button>
        </div>
      </div>
    )
  }

  const {
    title,
    description,
    price,
    category,
    images,
    seller,
    location,
    status,
    viewsCount,
    favoritesCount,
    attributes,
    createdAt,
  } = listing

  const displayImages = images?.length > 0 ? images : [defaultImage]
  const mainImage = displayImages[activeImage] ?? defaultImage
  const isSold = status === 'sold'
  const hasAttributes = attributes && Object.keys(attributes).length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-6 transition-colors group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Listings
        </button>

        {/* Top: image gallery + info panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* LEFT — Image gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-md">
              <img
                src={mainImage}
                alt={title}
                className="w-full h-full object-cover transition-opacity duration-200"
              />
              {isSold && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-white text-gray-800 text-sm font-semibold px-5 py-2 rounded-full tracking-wide">
                    Sold
                  </span>
                </div>
              )}
              <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
                {category?.name || 'General'}
              </span>
            </div>

            {displayImages.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {displayImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-150 flex-shrink-0 ${
                      activeImage === i
                        ? 'border-indigo-500 shadow-sm scale-105'
                        : 'border-gray-200 hover:border-indigo-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Info panel */}
          <div className="flex flex-col gap-5">

            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {title || 'Untitled Listing'}
              </h1>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl font-bold text-indigo-600">
                {formatPrice(price)}
              </span>
              {price?.negotiable && (
                <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full font-medium">
                  Negotiable
                </span>
              )}
              {isSold && (
                <span className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full font-medium">
                  Sold
                </span>
              )}
            </div>

            {/* Location */}
            {location?.city && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{location.city}, {location.state}</span>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-5 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {viewsCount ?? 0} views
              </span>
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {favoritesCount ?? 0} saves
              </span>
              <span>{timeAgo(createdAt)}</span>
            </div>

            <div className="border-t border-gray-100" />

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <button
                disabled={isSold}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {isSold ? 'Item Sold' : 'Chat with Seller'}
              </button>

              <button
                onClick={() => setSaved((s) => !s)}
                className={`w-full flex items-center justify-center gap-2 font-semibold py-3.5 px-6 rounded-xl border-2 transition-all duration-150 ${
                  saved
                    ? 'bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {saved ? 'Saved' : 'Save Listing'}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Description — 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
              {description || 'No description provided.'}
            </p>
          </div>

          {/* Seller card — 1 col */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-900">Seller Info</h2>
            <div className="flex items-center gap-3">
              <img
                src={defaultAvatar}
                alt="Seller avatar"
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
              />
              <div>
                <p className="font-semibold text-gray-800 text-sm">{formatSellerName(seller)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Active member</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400">
                Listed <span className="font-medium text-gray-600">{timeAgo(createdAt)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Attributes */}
        {hasAttributes && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Product Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">{formatAttributeKey(key)}</p>
                  <p className="text-sm font-semibold text-gray-800">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
