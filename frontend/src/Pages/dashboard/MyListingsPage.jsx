import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyListingsAPI, updateListingStatusAPI, getChatParticipantsAPI } from '../../api/listings.api'
import defaultImage from '../../assets/images/products/iphone13.jpg'
import defaultAvatar from '../../assets/images/default-avatar.jpg'

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

// ── Select Buyer Modal ────────────────────────────────────────────────────────

function SelectBuyerModal({ listingTitle, participants, onSelect, onSkip, onClose, busy }) {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Close">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div>
          <h3 className="text-base font-bold text-gray-900">Who bought this item?</h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Select the buyer to start the transaction.
          </p>
        </div>

        <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg truncate">
          {listingTitle}
        </p>

        {participants.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No chat participants found for this listing.
          </p>
        ) : (
          <div className="space-y-2">
            {participants.map((p) => (
              <button
                key={p._id}
                onClick={() => setSelected(p._id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-150 text-left ${
                  selected === p._id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <img
                  src={p.profileImage || defaultAvatar}
                  alt={p.name}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-200"
                />
                <span className="text-sm font-semibold text-gray-800 truncate flex-1">{p.name}</span>
                {selected === p._id && (
                  <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onSkip}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Skip (no buyer)
          </button>
          <button
            onClick={() => {
              const buyer = participants.find((p) => p._id === selected)
              if (buyer) onSelect(buyer)
            }}
            disabled={!selected || busy}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Mark Sold Confirmation Modal ──────────────────────────────────────────────

function MarkSoldConfirmModal({ listing, buyer, onConfirm, onPause, onCancel, busy }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <button onClick={onCancel} className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Close">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900">Confirm Sale</h3>
        </div>

        <div className="px-6 py-5 space-y-4">
          {buyer && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <img
                src={buyer.profileImage || defaultAvatar}
                alt={buyer.name}
                className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buyer</p>
                <p className="text-sm font-bold text-gray-900 truncate">{buyer.name}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <img
              src={listing.images?.[0] || defaultImage}
              alt={listing.title}
              className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Listing</p>
              <p className="text-sm font-bold text-gray-900 truncate">{listing.title}</p>
            </div>
            <span className="text-sm font-black text-indigo-600 flex-shrink-0">{formatPrice(listing.price)}</span>
          </div>

          <ul className="space-y-1.5">
            {[
              'Listing removed from marketplace search',
              'New buyer chats are blocked',
              'Reviews locked until both parties confirm',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
            If the exchange hasn't happened yet, consider <strong>pausing</strong> the listing instead.
          </p>
        </div>

        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={onConfirm}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {busy ? 'Marking sold…' : 'Confirm Sold'}
          </button>
          <button
            onClick={onPause}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Pause Listing Instead
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Transaction status badge ───────────────────────────────────────────────────

function TransactionStatus({ listing }) {
  if (listing.status !== 'sold') return null
  const tx = listing.transaction
  if (!tx?.buyer) return null

  if (tx.completedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        Deal Complete
      </span>
    )
  }

  const bothPending  = !tx.sellerConfirmed && !tx.buyerConfirmed
  const sellerDone   = tx.sellerConfirmed && !tx.buyerConfirmed
  const buyerDone    = tx.buyerConfirmed  && !tx.sellerConfirmed

  const label = bothPending  ? 'Awaiting Confirmations'
    : sellerDone  ? 'Waiting for Buyer'
    : buyerDone   ? 'Waiting for You'
    : 'Confirming…'

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      {label}
    </span>
  )
}

function ListingRow({ listing, onStatusChange }) {
  const [busy, setBusy]                   = useState(false)
  const [showBuyerModal, setShowBuyerModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [participants, setParticipants]   = useState([])
  const [pendingBuyer, setPendingBuyer]   = useState(null)
  const s = STATUS_STYLES[listing.status] || STATUS_STYLES.active

  const changeStatus = async (newStatus) => {
    if (busy) return
    if (newStatus === 'sold') {
      setBusy(true)
      try {
        const data = await getChatParticipantsAPI(listing._id)
        const parts = data.participants || []
        setParticipants(parts)
        if (parts.length > 0) {
          setShowBuyerModal(true)
        } else {
          // No chat participants — go straight to confirm modal without buyer
          setPendingBuyer(null)
          setShowConfirmModal(true)
        }
      } catch {
        // API error — go straight to confirm with no buyer
        setPendingBuyer(null)
        setShowConfirmModal(true)
      } finally {
        setBusy(false)
      }
      return
    }
    setBusy(true)
    try {
      await updateListingStatusAPI(listing._id, newStatus)
      onStatusChange(listing._id, newStatus)
    } catch {
      // silent
    } finally {
      setBusy(false)
    }
  }

  // Called from SelectBuyerModal when buyer is chosen → show confirm modal
  const handleBuyerSelected = (buyer) => {
    setPendingBuyer(buyer)
    setShowBuyerModal(false)
    setShowConfirmModal(true)
  }

  // Skip buyer selection → no buyer, show confirm modal
  const handleSkipBuyer = () => {
    setPendingBuyer(null)
    setShowBuyerModal(false)
    setShowConfirmModal(true)
  }

  const doMarkSold = async () => {
    setBusy(true)
    try {
      const result = await updateListingStatusAPI(listing._id, 'sold', pendingBuyer?._id || null)
      onStatusChange(listing._id, 'sold', result.listing)
    } catch {
      // silent
    } finally {
      setBusy(false)
      setShowConfirmModal(false)
      setPendingBuyer(null)
    }
  }

  const doPause = async () => {
    setShowConfirmModal(false)
    setShowBuyerModal(false)
    setPendingBuyer(null)
    setBusy(true)
    try {
      await updateListingStatusAPI(listing._id, 'paused')
      onStatusChange(listing._id, 'paused')
    } catch {
      // silent
    } finally {
      setBusy(false)
    }
  }

  const cancelModals = () => {
    setShowBuyerModal(false)
    setShowConfirmModal(false)
    setPendingBuyer(null)
  }

  return (
    <>
      {showBuyerModal && (
        <SelectBuyerModal
          listingTitle={listing.title}
          participants={participants}
          onSelect={handleBuyerSelected}
          onSkip={handleSkipBuyer}
          onClose={cancelModals}
          busy={busy}
        />
      )}
      {showConfirmModal && (
        <MarkSoldConfirmModal
          listing={listing}
          buyer={pendingBuyer}
          onConfirm={doMarkSold}
          onPause={doPause}
          onCancel={cancelModals}
          busy={busy}
        />
      )}

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
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-sm font-bold text-indigo-600">{formatPrice(listing.price)}</span>
            {listing.price?.negotiable && (
              <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-semibold">Negotiable</span>
            )}
            <TransactionStatus listing={listing} />
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
    </>
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

  const handleStatusChange = (id, newStatus, updatedListing = null) => {
    setListings((prev) =>
      prev.map((l) => {
        if (l._id !== id) return l
        if (updatedListing) return { ...l, ...updatedListing }
        return { ...l, status: newStatus }
      })
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
