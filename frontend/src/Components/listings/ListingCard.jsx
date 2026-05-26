import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
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

export default function ListingCard({ listing }) {
  if (!listing) return null

  const {
    _id,
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
    createdAt,
  } = listing

  const allImages = images?.length > 0 ? images : [defaultImage]
  const hasMultiple = allImages.length > 1

  const [activeIdx, setActiveIdx] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const scrollAccRef = useRef(0)
  const scrollTimerRef = useRef(null)

  const isSold = status === 'sold'
  const sellerId = typeof seller === 'string' ? seller.replace('user_', '#') : '?'

  const goNext = useCallback((e) => {
    e?.preventDefault()
    e?.stopPropagation()
    setActiveIdx((i) => (i + 1) % allImages.length)
    setImgLoaded(false)
  }, [allImages.length])

  const goPrev = useCallback((e) => {
    e?.preventDefault()
    e?.stopPropagation()
    setActiveIdx((i) => (i - 1 + allImages.length) % allImages.length)
    setImgLoaded(false)
  }, [allImages.length])

  const handleWheel = useCallback((e) => {
    if (!hasMultiple) return
    e.preventDefault()
    e.stopPropagation()

    scrollAccRef.current += e.deltaY
    clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      scrollAccRef.current = 0
    }, 300)

    if (Math.abs(scrollAccRef.current) >= 80) {
      scrollAccRef.current > 0 ? goNext() : goPrev()
      scrollAccRef.current = 0
    }
  }, [hasMultiple, goNext, goPrev])

  const goTo = useCallback((e, idx) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveIdx(idx)
    setImgLoaded(false)
  }, [])

  return (
    <Link
      to={`/listings/${_id}`}
      className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all duration-200 flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div
        className="relative aspect-[4/3] overflow-hidden bg-gray-100 select-none"
        onWheel={handleWheel}
      >
        {/* Main image with fade transition */}
        <img
          key={activeIdx}
          src={allImages[activeIdx]}
          alt={title || 'Listing'}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.03] ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Skeleton while loading */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <span className="bg-white text-gray-800 text-sm font-semibold px-3 py-1 rounded-full">
              Sold
            </span>
          </div>
        )}

        {/* Category badge */}
        <span className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
          {category?.name || 'General'}
        </span>

        {/* Image count badge */}
        {hasMultiple && (
          <span className="absolute top-2 right-2 z-10 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {activeIdx + 1}/{allImages.length}
          </span>
        )}

        {/* Prev / Next buttons — show on hover if multiple images */}
        {hasMultiple && hovered && !isSold && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-lg transition-all duration-150 hover:scale-110"
              aria-label="Previous image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-lg transition-all duration-150 hover:scale-110"
              aria-label="Next image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => goTo(e, i)}
                className={`rounded-full transition-all duration-200 ${
                  i === activeIdx
                    ? 'w-4 h-1.5 bg-white shadow'
                    : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90'
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Scroll hint — shown briefly on first hover */}
        {hasMultiple && hovered && (
          <div className="absolute bottom-7 right-2 z-10 text-[10px] text-white/70 font-medium pointer-events-none">
            scroll to browse
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">
          {title || 'Untitled'}
        </p>

        {description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
            {description}
          </p>
        )}

        <div className="flex items-center gap-2 mb-2">
          <p className="text-lg font-bold text-indigo-600">
            {formatPrice(price)}
          </p>
          {price?.negotiable && (
            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">
              Negotiable
            </span>
          )}
        </div>

        {location?.city && (
          <p className="text-xs text-gray-400 mb-3">
            📍 {location.city}, {location.state}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span>Seller {sellerId}</span>
            <span>👁 {viewsCount ?? 0}</span>
            <span>♡ {favoritesCount ?? 0}</span>
          </div>
          <span className="flex-shrink-0">{timeAgo(createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}
