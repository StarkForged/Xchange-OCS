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
  if (!seller) return 'Unknown Seller'
  if (typeof seller === 'object') return seller.name || 'Unknown Seller'
  return 'Unknown Seller'
}

const formatAttributeKey = (key) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())

export default function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [listing, setListing]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [activeImage, setActiveImage] = useState(0)
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchListing = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getListingById(id)
        if (!cancelled) { setListing(data); setActiveImage(0) }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Listing not found')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchListing()
    return () => { cancelled = true }
  }, [id])

  /* ── loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm font-medium tracking-wide">Loading listing…</span>
        </div>
      </div>
    )
  }

  /* ── error ── */
  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-700 font-semibold text-base mb-3">{error || 'Listing not found'}</p>
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
    title, description, price, category,
    images, seller, location, status,
    viewsCount, favoritesCount, attributes, createdAt,
  } = listing

  const displayImages  = images?.length > 0 ? images : [defaultImage]
  const mainImage      = displayImages[activeImage] ?? defaultImage
  const isSold         = status === 'sold'
  const hasAttributes  = attributes && Object.keys(attributes).length > 0
  const saves          = favoritesCount ?? 0
  const views          = viewsCount ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-gray-100">
      <style>{`
        @keyframes fsu {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fsu   { animation: fsu 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .fsu-1 { animation: fsu 0.5s 0.07s cubic-bezier(0.22,1,0.36,1) both; }
        .fsu-2 { animation: fsu 0.5s 0.14s cubic-bezier(0.22,1,0.36,1) both; }
        .fsu-3 { animation: fsu 0.5s 0.21s cubic-bezier(0.22,1,0.36,1) both; }
        .fsu-4 { animation: fsu 0.5s 0.28s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Back ── */}
        <button
          onClick={() => navigate(-1)}
          className="fsu inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-7 transition-colors group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Listings
        </button>

        {/* ── TOP GRID: image | sticky info panel ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 items-start">

          {/* LEFT — Image gallery */}
          <div className="fsu-1 space-y-3">

            {/* Main image */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200 shadow-xl ring-1 ring-black/8 group/img">
              <img
                key={activeImage}
                src={mainImage}
                alt={title}
                className="w-full h-full object-cover group-hover/img:scale-[1.04] transition-transform duration-700 ease-out"
              />

              {/* Depth gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />

              {/* Sold overlay */}
              {isSold && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center z-10">
                  <span className="bg-white text-gray-800 text-sm font-bold px-6 py-2.5 rounded-full tracking-widest shadow-lg uppercase">
                    Sold
                  </span>
                </div>
              )}

              {/* Category pill — top left */}
              <span className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-md text-indigo-700 text-xs font-bold px-3 py-1 rounded-full capitalize shadow-sm tracking-wide">
                {category?.name || 'General'}
              </span>

              {/* Image counter — top right */}
              {displayImages.length > 1 && (
                <span className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums">
                  {activeImage + 1} / {displayImages.length}
                </span>
              )}

              {/* View count — bottom left (on gradient) */}
              <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 text-white/90 text-xs font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {views} views
              </div>
            </div>

            {/* Thumbnails */}
            {displayImages.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {displayImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 flex-shrink-0 ${
                      activeImage === i
                        ? 'border-indigo-500 shadow-md scale-105 ring-2 ring-indigo-200'
                        : 'border-gray-200 hover:border-indigo-300 opacity-55 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Sticky info card */}
          <div className="fsu-2 md:sticky md:top-6 bg-white rounded-2xl border border-gray-100 shadow-md p-6 space-y-5">

            {/* Eyebrow + Title */}
            <div>
              <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
                {category?.name || 'General'}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                {title || 'Untitled Listing'}
              </h1>
            </div>

            {/* Price */}
            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-4xl sm:text-5xl font-black text-indigo-600 tracking-tight leading-none">
                {formatPrice(price)}
              </span>
              {price?.negotiable && (
                <span className="mb-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full font-bold">
                  Negotiable
                </span>
              )}
              {isSold && (
                <span className="mb-1 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full font-bold">
                  Sold
                </span>
              )}
            </div>

            {/* Location */}
            {location?.city && (
              <div className="inline-flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl w-fit">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold text-gray-700">{location.city}, {location.state}</span>
              </div>
            )}

            {/* Engagement trigger — social proof */}
            {saves > 0 && !isSold && (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-xl">
                <span className="text-base">🔥</span>
                <span>{saves} {saves === 1 ? 'person has' : 'people have'} saved this listing</span>
              </div>
            )}

            {/* Posted time */}
            <p className="text-xs text-gray-400 -mt-1">
              Posted <span className="font-semibold text-gray-500">{timeAgo(createdAt)}</span>
            </p>

            <div className="border-t border-gray-100" />

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <button
                disabled={isSold}
                onClick={() => navigate(`/chat/${id}`)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-md text-sm tracking-wide"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {isSold ? 'Item Sold' : 'Chat with Seller'}
              </button>

              <button
                onClick={() => setSaved((s) => !s)}
                className={`w-full flex items-center justify-center gap-2 font-bold py-4 px-6 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-sm tracking-wide ${
                  saved
                    ? 'bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100 hover:shadow-lg hover:shadow-rose-100 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-lg'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${saved ? 'scale-110' : ''}`}
                  fill={saved ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {saved ? 'Saved to Wishlist!' : 'Save Listing'}
              </button>
            </div>

            <div className="border-t border-gray-100" />

            {/* Seller mini-card inside sticky panel */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <img
                    src={typeof seller === 'object' && seller?.profileImage ? seller.profileImage : defaultAvatar}
                    alt="Seller"
                    className="w-11 h-11 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 leading-tight truncate">
                    {formatSellerName(seller)}
                  </p>
                  {/* Trust score mini bar */}
                  {typeof seller === 'object' && seller?.trustScore != null && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            seller.trustScore >= 80 ? 'bg-amber-400'
                            : seller.trustScore >= 50 ? 'bg-emerald-400'
                            : seller.trustScore > 0  ? 'bg-sky-400'
                            : 'bg-gray-300'
                          }`}
                          style={{ width: `${seller.trustScore}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 flex-shrink-0">
                        {seller.trustScore}/100
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-400 mb-0.5">Joined</p>
                  <p className="text-xs font-semibold text-gray-600">
                    {timeAgo(typeof seller === 'object' ? seller?.createdAt : createdAt)}
                  </p>
                </div>
              </div>

              {/* Seller badges (max 3) */}
              {typeof seller === 'object' && seller?.badges?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {seller.badges.slice(0, 3).map((b) => (
                    <span
                      key={b.id}
                      title={b.description}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600"
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Fallback if no badges yet */}
              {(typeof seller !== 'object' || !seller?.badges?.length) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  ✓ Verified Seller
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Description + Attributes ── */}
        <div className="space-y-5">

          {/* Description */}
          <div className="fsu-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              <span className="w-1 h-4 bg-indigo-500 rounded-full flex-shrink-0" />
              Description
            </h2>
            <p className="text-gray-600 text-sm leading-7 whitespace-pre-line">
              {description || 'No description provided.'}
            </p>
          </div>

          {/* Attributes */}
          {hasAttributes && (
            <div className="fsu-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                <span className="w-1 h-4 bg-indigo-500 rounded-full flex-shrink-0" />
                Product Details
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(attributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="group bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 hover:-translate-y-0.5 hover:shadow-sm rounded-xl px-4 py-3 transition-all duration-200 cursor-default"
                  >
                    <p className="text-[10px] font-black text-indigo-400 group-hover:text-indigo-500 uppercase tracking-widest mb-1.5">
                      {formatAttributeKey(key)}
                    </p>
                    <p className="text-sm font-bold text-gray-800 leading-tight">
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
