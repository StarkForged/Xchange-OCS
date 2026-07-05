import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { animate } from 'framer-motion'
import { NO_IMAGE_PLACEHOLDER as defaultImage } from '../../constants/placeholderImage'
import useAuthStore from '../../store/auth.Store'
import { toggleSavedListingAPI } from '../../api/user.api'

const formatPrice = (price) =>
  '₹' + (price?.amount?.toLocaleString('en-IN') ?? '0')

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const ms   = Date.now() - new Date(dateStr)
  const mins  = Math.floor(ms / 60000)
  const hours = Math.floor(ms / 3600000)
  const days  = Math.floor(ms / 86400000)
  if (mins  < 1)  return 'Just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  === 1) return 'Yesterday'
  return `${days}d ago`
}

const fmtViews = (n) => {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function ListingCard({ listing }) {
  if (!listing) return null

  const {
    _id, title, description, price, category,
    images, seller, location, status,
    viewsCount, favoritesCount, createdAt,
  } = listing

  const allImages  = images?.length > 0 ? images : [defaultImage]
  const hasMultiple = allImages.length > 1

  // Pull saved state directly from the persisted store — no local useState.
  // Any component that calls addSavedId/removeSavedId will cause a re-render here.
  const { isAuthenticated, savedListingIds, addSavedId, removeSavedId, setSavedListingIds } = useAuthStore()
  const saved    = savedListingIds.includes(_id)
  const [toggling, setToggling] = useState(false)

  const [activeIdx, setActiveIdx] = useState(0)
  const [hovered,   setHovered]   = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const scrollAccRef   = useRef(0)
  const scrollTimerRef = useRef(null)
  const imgAreaRef     = useRef(null)   // ref to image area div, used for fly animation

  const isSold     = status === 'sold'
  const isPaused   = status === 'paused'
  const sellerObj  = typeof seller === 'object' ? seller : null
  const sellerName = sellerObj?.name || 'Seller'
  const isVerified = !!sellerObj?.name
  const trustScore = sellerObj?.trustScore ?? null
  const topBadge   = sellerObj?.badges?.[0] ?? null
  const isGhost    = sellerObj?.ghostRisk?.flagged

  const trustTierBadge = trustScore == null ? null
    : trustScore >= 90 ? { label: 'Top Seller', cls: 'bg-yellow-50 text-yellow-800 border-yellow-300' }
    : trustScore >= 80 ? { label: 'Trusted',    cls: 'bg-amber-50 text-amber-700 border-amber-200'   }
    : trustScore >= 50 ? { label: 'Building',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : null

  const goNext = useCallback((e) => {
    e?.preventDefault(); e?.stopPropagation()
    setActiveIdx((i) => (i + 1) % allImages.length)
    setImgLoaded(false)
  }, [allImages.length])

  const goPrev = useCallback((e) => {
    e?.preventDefault(); e?.stopPropagation()
    setActiveIdx((i) => (i - 1 + allImages.length) % allImages.length)
    setImgLoaded(false)
  }, [allImages.length])

  const handleWheel = useCallback((e) => {
    if (!hasMultiple) return
    e.preventDefault(); e.stopPropagation()
    scrollAccRef.current += e.deltaY
    clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => { scrollAccRef.current = 0 }, 300)
    if (Math.abs(scrollAccRef.current) >= 80) {
      scrollAccRef.current > 0 ? goNext() : goPrev()
      scrollAccRef.current = 0
    }
  }, [hasMultiple, goNext, goPrev])

  const goTo = useCallback((e, idx) => {
    e.preventDefault(); e.stopPropagation()
    setActiveIdx(idx); setImgLoaded(false)
  }, [])

  // ── Fly-to-heart animation ─────────────────────────────────────────────
  // Creates a ghost thumbnail that animates from the listing image to the
  // navbar heart icon (data-heart-target). Pulses the heart on arrival.
  const animateFlyToHeart = useCallback(() => {
    const imgEl   = imgAreaRef.current
    const heartEl = document.querySelector('[data-heart-target]')
    if (!imgEl || !heartEl) return

    const fromRect = imgEl.getBoundingClientRect()
    const toRect   = heartEl.getBoundingClientRect()

    const ghost = document.createElement('div')
    const currentImg = allImages[activeIdx]

    Object.assign(ghost.style, {
      position:      'fixed',
      left:          `${fromRect.left}px`,
      top:           `${fromRect.top}px`,
      width:         `${fromRect.width}px`,
      height:        `${fromRect.height}px`,
      backgroundImage: `url(${currentImg})`,
      backgroundSize:  'cover',
      backgroundPosition: 'center',
      borderRadius:  '12px',
      pointerEvents: 'none',
      zIndex:        '99999',
      willChange:    'transform, opacity, border-radius',
    })
    document.body.appendChild(ghost)

    // Translate to the heart icon center relative to the ghost's starting position
    const dx = (toRect.left + toRect.width  / 2) - (fromRect.left + fromRect.width  / 2)
    const dy = (toRect.top  + toRect.height / 2) - (fromRect.top  + fromRect.height / 2)

    animate(ghost, {
      x:            dx,
      y:            dy,
      scale:        [1, 0.85, 0.12],
      borderRadius: ['12px', '20px', '50%'],
      opacity:      [1, 1, 0.9, 0],
    }, {
      duration: 0.52,
      ease:     [0.4, 0, 0.2, 1],
      onComplete: () => {
        ghost.remove()
        animate(heartEl, { scale: [1, 1.4, 0.85, 1] }, { duration: 0.38, ease: 'easeOut' })
      },
    })
  }, [allImages, activeIdx])

  const toggleSave = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated || toggling) return

    const willSave = !saved
    setToggling(true)

    // Optimistic update — instant visual feedback
    if (willSave) {
      addSavedId(_id)
      animateFlyToHeart()   // only animate when saving, not unsaving
    } else {
      removeSavedId(_id)
    }

    try {
      const { savedListingIds: serverIds } = await toggleSavedListingAPI(_id)
      setSavedListingIds(serverIds)
    } catch {
      // Revert on failure
      if (willSave) removeSavedId(_id)
      else           addSavedId(_id)
    } finally {
      setToggling(false)
    }
  }

  return (
    <Link
      to={`/listings/${_id}`}
      className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all duration-200 flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image area ── */}
      <div ref={imgAreaRef} className="relative aspect-[4/3] overflow-hidden bg-gray-100 select-none" onWheel={handleWheel}>

        <img
          key={activeIdx}
          src={allImages[activeIdx]}
          alt={title || 'Listing'}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.03] ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        {!imgLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <span className="bg-white text-gray-800 text-sm font-semibold px-3 py-1 rounded-full tracking-wide uppercase text-xs">Sold</span>
          </div>
        )}

        {/* Paused overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-amber-900/40 flex items-center justify-center z-10">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full tracking-wide uppercase">Paused</span>
          </div>
        )}

        {/* Category badge — top left */}
        <span className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm text-indigo-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize shadow-sm">
          {category?.name || 'General'}
        </span>

        {/* Save / Heart button — top right */}
        <button
          onClick={toggleSave}
          disabled={toggling}
          className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 active:scale-95 disabled:cursor-default ${
            saved ? 'bg-rose-500' : 'bg-white/90 backdrop-blur-sm'
          } ${!isAuthenticated ? 'cursor-default' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save listing'}
          title={!isAuthenticated ? 'Log in to save listings' : saved ? 'Saved' : 'Save listing'}
        >
          <Heart
            className={`w-4 h-4 transition-all duration-200 ${toggling ? 'scale-90' : ''}`}
            fill={saved ? 'white' : 'none'}
            stroke={saved ? 'white' : '#9ca3af'}
            strokeWidth={2}
          />
        </button>

        {/* Image count — bottom right (only when multiple) */}
        {hasMultiple && (
          <span className="absolute bottom-2 right-2 z-10 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums">
            {activeIdx + 1}/{allImages.length}
          </span>
        )}

        {/* Prev / Next arrows (on hover) */}
        {hasMultiple && hovered && !isSold && !isPaused && (
          <>
            <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-lg transition-all hover:scale-110" aria-label="Previous">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-lg transition-all hover:scale-110" aria-label="Next">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
            {allImages.map((_, i) => (
              <button key={i} onClick={(e) => goTo(e, i)} aria-label={`Image ${i + 1}`}
                className={`rounded-full transition-all duration-200 ${i === activeIdx ? 'w-4 h-1.5 bg-white shadow' : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="p-3.5 flex flex-col flex-1">

        {/* Title */}
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1.5">
          {title || 'Untitled'}
        </p>

        {/* Price row */}
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-base font-bold text-indigo-600">{formatPrice(price)}</p>
          {price?.negotiable && (
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">Neg.</span>
          )}
        </div>

        {/* Location */}
        {location?.city && (
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {location.city}{location.state ? `, ${location.state}` : ''}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-2 border-t border-gray-50 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Seller */}
              <span className="text-xs text-gray-600 font-medium truncate max-w-[80px]">{sellerName}</span>
              {isVerified && (
                <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-shrink-0">
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {fmtViews(viewsCount)}
              </span>
              <span>{timeAgo(createdAt)}</span>
            </div>
          </div>

          {/* Trust signals row */}
          {(trustTierBadge || topBadge || isGhost) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {trustTierBadge && (
                <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${trustTierBadge.cls}`}>
                  {trustTierBadge.label}
                </span>
              )}
              {topBadge && !trustTierBadge && (
                <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
                  {topBadge.label}
                </span>
              )}
              {isGhost && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                  ⚠ Less active
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
