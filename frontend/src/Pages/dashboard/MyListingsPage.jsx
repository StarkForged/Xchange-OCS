import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyListingsAPI, updateListingStatusAPI } from '../../api/listings.api'
import defaultImage from '../../assets/images/products/iphone13.jpg'

const formatPrice = (p) => p?.amount != null ? `₹${p.amount.toLocaleString('en-IN')}` : '—'

const timeAgo = (d) => {
  if (!d) return ''
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

const STATUS_STYLES = {
  active: { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: 'Active' },
  sold:   { bg: 'bg-gray-100   text-gray-500   ring-gray-200',     dot: 'bg-gray-400',   label: 'Sold'   },
  paused: { bg: 'bg-amber-50   text-amber-700  ring-amber-200',    dot: 'bg-amber-500',  label: 'Paused' },
}

function ActionButton({ onClick, disabled, title, colorClass, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${colorClass}`}
    >
      {children}
    </button>
  )
}

function ListingRow({ listing, onStatusChange }) {
  const [busy, setBusy] = useState(false)
  const s = STATUS_STYLES[listing.status] || STATUS_STYLES.active

  const changeStatus = async (newStatus) => {
    if (busy) return
    setBusy(true)
    try {
      await updateListingStatusAPI(listing._id, newStatus)
      onStatusChange(listing._id, newStatus)
    } catch {
      // silently fail — server error will not crash the page
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 p-4 transition-all duration-200">

      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 relative">
        <img
          src={listing.images?.[0] || defaultImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {listing.status === 'sold' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Sold</span>
          </div>
        )}
        {listing.status === 'paused' && (
          <div className="absolute inset-0 bg-amber-900/30 flex items-center justify-center rounded-xl">
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Paused</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{listing.title}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {listing.category?.name || 'General'} · {listing.location?.city || '—'}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-sm font-bold text-indigo-600">{formatPrice(listing.price)}</span>
          {listing.price?.negotiable && (
            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-semibold">Negotiable</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-5 flex-shrink-0">
        <div className="text-center">
          <p className="text-sm font-bold text-gray-900">{listing.viewsCount ?? 0}</p>
          <p className="text-[10px] text-gray-400 font-medium">Views</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-900">{listing.favoritesCount ?? 0}</p>
          <p className="text-[10px] text-gray-400 font-medium">Saves</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-600">{timeAgo(listing.createdAt)}</p>
          <p className="text-[10px] text-gray-400 font-medium">Posted</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0 hidden sm:block">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${s.bg} ${s.ring}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {/* View — always available */}
        <Link
          to={`/listings/${listing._id}`}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="View listing"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </Link>

        {/* Active: Pause + Mark Sold */}
        {listing.status === 'active' && (
          <>
            <ActionButton
              onClick={() => changeStatus('paused')}
              disabled={busy}
              title="Pause listing"
              colorClass="hover:text-amber-600 hover:bg-amber-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
                <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </ActionButton>
            <ActionButton
              onClick={() => changeStatus('sold')}
              disabled={busy}
              title="Mark as sold"
              colorClass="hover:text-emerald-600 hover:bg-emerald-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </ActionButton>
          </>
        )}

        {/* Paused: Resume + Mark Sold */}
        {listing.status === 'paused' && (
          <>
            <ActionButton
              onClick={() => changeStatus('active')}
              disabled={busy}
              title="Resume listing"
              colorClass="hover:text-emerald-600 hover:bg-emerald-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-6.518-3.75A1 1 0 007 8.25v7.5a1 1 0 001.234.97l6.518-1.874A1 1 0 0016 13.874v-1.748a1 1 0 00-.748-.958z" />
              </svg>
            </ActionButton>
            <ActionButton
              onClick={() => changeStatus('sold')}
              disabled={busy}
              title="Mark as sold"
              colorClass="hover:text-emerald-600 hover:bg-emerald-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </ActionButton>
          </>
        )}

        {/* Sold: no further transitions, just view (already rendered above) */}
      </div>
    </div>
  )
}

export default function MyListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')

  useEffect(() => {
    let cancelled = false
    getMyListingsAPI()
      .then((r) => { if (!cancelled) setListings(r.listings || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleStatusChange = (id, newStatus) => {
    setListings((prev) =>
      prev.map((l) => (l._id === id ? { ...l, status: newStatus } : l))
    )
  }

  const filtered = filter === 'all'
    ? listings
    : listings.filter((l) => l.status === filter)

  const counts = {
    all:    listings.length,
    active: listings.filter((l) => l.status === 'active').length,
    sold:   listings.filter((l) => l.status === 'sold').length,
    paused: listings.filter((l) => l.status === 'paused').length,
  }

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Listings</h1>
          <p className="text-sm text-gray-400 mt-1">
            {loading ? 'Loading...' : `${listings.length} listing${listings.length !== 1 ? 's' : ''} posted`}
          </p>
        </div>
        <Link
          to="/create-listing"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Listing
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'all',    label: 'All'    },
          { key: 'active', label: 'Active' },
          { key: 'sold',   label: 'Sold'   },
          { key: 'paused', label: 'Paused' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              filter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-base font-semibold text-gray-700 mb-1">
            {filter === 'all' ? 'No listings yet' : `No ${filter} listings`}
          </p>
          <p className="text-sm text-gray-400 mb-6">
            {filter === 'all'
              ? 'Start selling by posting your first listing'
              : `You have no listings with "${filter}" status`}
          </p>
          {filter === 'all' && (
            <Link
              to="/create-listing"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Post First Listing
            </Link>
          )}
        </div>
      )}

      {/* Listing rows */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((listing) => (
            <ListingRow
              key={listing._id}
              listing={listing}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
