import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAdminListingsAPI,
  hideListingAPI,
  unhideListingAPI,
  removeListingAPI,
  restoreListingAPI,
  featureListingAPI,
} from '../../../api/admin.api'
import { categories } from '../../../mock/categories'
import ActionMenu from '../../../components/ui/ActionMenu'
import { HideListingModal, RemoveListingModal, FeatureListingModal } from './ModerationModals'

const formatPrice = (p) => p?.amount != null ? `₹${p.amount.toLocaleString('en-IN')}` : '—'

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLES = {
  active:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  paused:  'bg-amber-500/10   text-amber-400   border-amber-500/20',
  sold:    'bg-slate-700      text-slate-300   border-slate-600',
  removed: 'bg-rose-500/10    text-rose-400    border-rose-500/20',
}

const PRIORITY_STYLES = {
  low:      'bg-sky-500/10    text-sky-400    border-sky-500/20',
  medium:   'bg-amber-500/10  text-amber-400  border-amber-500/20',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-rose-500/10   text-rose-400   border-rose-500/20',
}

function StatusBadge({ listing }) {
  const s = STATUS_STYLES[listing.status] || 'bg-slate-700 text-slate-400 border-slate-600'
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${s}`}>
      {listing.status}
    </span>
  )
}

function PriorityBadge({ priority }) {
  if (!priority || priority === 'none') return <span className="text-slate-600 text-xs">0</span>
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.low
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${s}`}>
      {priority}
    </span>
  )
}

function Badges({ listing }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {listing.seller?.isVerifiedSeller && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">✓ Verified</span>
      )}
      {listing.isHidden && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">Under Review</span>
      )}
      {listing.reportsCount > 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">⚠ {listing.reportsCount} Reported</span>
      )}
      {listing.featured && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">★ Featured</span>
      )}
    </div>
  )
}

// Native <select> with a manually centered chevron — the browser's built-in
// arrow renders off-center once custom padding/border-radius are applied.
function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded-xl pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <svg className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

// Rounded toggle pill — replaces the old checkbox+label for binary filters.
function TogglePill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
        active
          ? 'bg-indigo-600 border-indigo-500 text-white'
          : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200'
      }`}
    >
      {active && (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {children}
    </button>
  )
}

// Counts up from 0 on first mount / whenever the target value changes —
// a light "loading" flourish for the summary cards.
function AnimatedNumber({ value = 0 }) {
  const [display, setDisplay] = useState(0)
  const frame = useRef(null)

  useEffect(() => {
    const target = Number(value) || 0
    const start = performance.now()
    const duration = 450
    const from = display

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (target - from) * eased))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return display.toLocaleString('en-IN')
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 transition-all duration-200 hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-white'}`}><AnimatedNumber value={value} /></p>
    </div>
  )
}

function PageBtn({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-700/50">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3 animate-pulse">
          <div className="w-12 h-12 rounded-lg bg-slate-700 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-slate-700 rounded w-40" />
            <div className="h-2.5 bg-slate-700 rounded w-24" />
          </div>
          <div className="h-5 w-16 bg-slate-700 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="p-14 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center">
        <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5V6a2 2 0 00-2-2H5a2 2 0 00-2 2v1.5m18 0v10a2 2 0 01-2 2H5a2 2 0 01-2-2v-10m18 0l-9 6-9-6" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-300">
        {hasFilters ? 'No listings match your filters' : 'No listings yet'}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        {hasFilters ? 'Try widening your search or clearing filters.' : 'Listings will show up here once sellers start posting.'}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="mt-4 text-xs font-semibold text-indigo-400 hover:text-indigo-300">
          Clear filters
        </button>
      )}
    </div>
  )
}

export default function ListingsPage() {
  const navigate = useNavigate()

  const [listings,    setListings]    = useState([])
  const [summary,     setSummary]     = useState({})
  const [pagination,  setPagination]  = useState({ page: 1, pages: 1, total: 0, limit: 20 })
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [minPrice,    setMinPrice]    = useState('')
  const [maxPrice,    setMaxPrice]    = useState('')
  const [reportedOnly, setReportedOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sortBy,      setSortBy]      = useState('newest')
  const [page,        setPage]        = useState(1)

  const [openMenuId,  setOpenMenuId]  = useState(null)
  const [hideTarget,  setHideTarget]  = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [featureTarget, setFeatureTarget] = useState(null)
  const [actionBusy,  setActionBusy]  = useState(false)
  const [toast,       setToast]       = useState('')

  // Debounce search input → search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 20, sortBy }
      if (search)         params.search = search
      if (statusFilter)   params.status = statusFilter
      if (categoryFilter) params.category = categoryFilter
      if (minPrice !== '') params.minPrice = minPrice
      if (maxPrice !== '') params.maxPrice = maxPrice
      if (reportedOnly)   params.reportedOnly = 'true'
      if (verifiedOnly)   params.verifiedOnly = 'true'

      const data = await getAdminListingsAPI(params)
      setListings(data.listings)
      setSummary(data.summary)
      setPagination(data.pagination)
    } catch (e) {
      setError(e.message || 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, categoryFilter, minPrice, maxPrice, reportedOnly, verifiedOnly, sortBy])

  useEffect(() => { load() }, [load])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const patchListing = (id, patch) => {
    setListings((prev) => prev.map((l) => (l._id === id ? { ...l, ...patch } : l)))
  }

  const doHide = async (reason, note) => {
    if (!hideTarget) return
    setActionBusy(true)
    try {
      const data = await hideListingAPI(hideTarget._id, reason, note)
      patchListing(hideTarget._id, data.listing)
      showToast('✓ Listing hidden')
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setActionBusy(false)
      setHideTarget(null)
    }
  }

  const doUnhide = async (listing) => {
    setActionBusy(true)
    try {
      const data = await unhideListingAPI(listing._id)
      patchListing(listing._id, data.listing)
      showToast('✓ Listing unhidden')
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setActionBusy(false)
    }
  }

  const doRemove = async (reason) => {
    if (!removeTarget) return
    setActionBusy(true)
    try {
      await removeListingAPI(removeTarget._id, 'DELETE', reason)
      setListings((prev) => prev.filter((l) => l._id !== removeTarget._id))
      showToast('✓ Listing removed')
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setActionBusy(false)
      setRemoveTarget(null)
    }
  }

  const doRestore = async (listing) => {
    setActionBusy(true)
    try {
      const data = await restoreListingAPI(listing._id)
      if (statusFilter === 'removed') {
        setListings((prev) => prev.filter((l) => l._id !== listing._id))
      } else {
        patchListing(listing._id, data.listing)
      }
      showToast('✓ Listing restored')
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setActionBusy(false)
    }
  }

  const doFeature = async (listing, reason = '') => {
    setActionBusy(true)
    try {
      const data = await featureListingAPI(listing._id, !listing.featured, null, reason)
      patchListing(listing._id, data.listing)
      showToast(data.listing.featured ? '✓ Listing featured' : '✓ Listing unfeatured')
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setActionBusy(false)
      setFeatureTarget(null)
    }
  }

  const copyId = (id) => {
    navigator.clipboard?.writeText(id)
    showToast('✓ Listing ID copied')
  }

  const clearFilters = () => {
    setSearchInput(''); setSearch('')
    setStatusFilter(''); setCategoryFilter('')
    setMinPrice(''); setMaxPrice('')
    setReportedOnly(false); setVerifiedOnly(false)
    setSortBy('newest'); setPage(1)
  }

  const hasFilters = search || statusFilter || categoryFilter || minPrice || maxPrice || reportedOnly || verifiedOnly

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Listings</h1>
        <p className="text-sm text-slate-400 mt-1">
          {loading ? 'Loading…' : `${pagination.total.toLocaleString()} listings total`}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total"    value={summary.total} />
        <SummaryCard label="Active"   value={summary.active}   accent="text-emerald-400" />
        <SummaryCard label="Paused"   value={summary.paused}   accent="text-amber-400" />
        <SummaryCard label="Sold"     value={summary.sold}     accent="text-slate-300" />
        <SummaryCard label="Under Review" value={summary.hidden}   accent="text-slate-300" />
        <SummaryCard label="Reported" value={summary.reported} accent="text-rose-400" />
      </div>

      {/* Search + Filters */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by title, seller name, or listing ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 min-w-[160px] sm:min-w-[220px] bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <input
            type="number"
            placeholder="Min ₹"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setPage(1) }}
            className="w-20 sm:w-24 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <input
            type="number"
            placeholder="Max ₹"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setPage(1) }}
            className="w-20 sm:w-24 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={[
              { v: '', l: 'All Statuses' },
              { v: 'active', l: 'Active' },
              { v: 'paused', l: 'Paused' },
              { v: 'sold',   l: 'Sold' },
              { v: 'hidden', l: 'Under Review' },
              { v: 'removed', l: 'Removed' },
            ]}
          />
          <Select
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); setPage(1) }}
            options={[{ v: '', l: 'All Categories' }, ...categories.map((c) => ({ v: c.id, l: c.name }))]}
          />
          <Select
            value={sortBy}
            onChange={(v) => { setSortBy(v); setPage(1) }}
            options={[
              { v: 'newest',     l: 'Newest' },
              { v: 'oldest',     l: 'Oldest' },
              { v: 'mostViewed', l: 'Most Viewed' },
            ]}
          />

          <TogglePill active={reportedOnly} onClick={() => { setReportedOnly((v) => !v); setPage(1) }}>
            Reported Only
          </TogglePill>
          <TogglePill active={verifiedOnly} onClick={() => { setVerifiedOnly((v) => !v); setPage(1) }}>
            Verified Sellers Only
          </TogglePill>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-xl text-xs transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-red-400">{error}</div>
        ) : loading ? (
          <TableSkeleton />
        ) : listings.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Listing', 'Seller', 'Category', 'Price', 'Status', 'Reports', 'Views', 'Created', 'Updated', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider first:pl-5 last:pr-5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {listings.map((listing) => (
                  <tr
                    key={listing._id}
                    onClick={() => navigate(`/admin/listings/${listing._id}`)}
                    className="hover:bg-slate-700/40 hover:shadow-[inset_2px_0_0_#6366f1] transition-all cursor-pointer"
                  >
                    <td className="px-4 pl-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={listing.images?.[0]}
                          alt=""
                          className="w-11 h-11 rounded-lg object-cover bg-slate-700 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate max-w-[200px]">{listing.title}</p>
                          <Badges listing={listing} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[130px] truncate">{listing.seller?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{listing.category?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-indigo-400 whitespace-nowrap">{formatPrice(listing.price)}</td>
                    <td className="px-4 py-3"><StatusBadge listing={listing} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={listing.reportPriority} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{listing.viewsCount ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(listing.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(listing.updatedAt)}</td>
                    <td className="px-4 pr-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        isOpen={openMenuId === listing._id}
                        onToggle={() => setOpenMenuId((v) => (v === listing._id ? null : listing._id))}
                        onClose={() => setOpenMenuId((v) => (v === listing._id ? null : v))}
                        disabled={actionBusy}
                        items={[
                          { key: 'open',   label: 'Open Listing',  onClick: () => window.open(`/listings/${listing._id}`, '_blank') },
                          { key: 'seller', label: 'View Seller',   onClick: () => navigate(`/admin/users?search=${encodeURIComponent(listing.seller?.email || '')}`) },
                          { key: 'copy',   label: 'Copy Listing ID', onClick: () => copyId(listing._id) },
                          ...(listing.status === 'removed'
                            ? [{ key: 'restore', label: 'Restore Listing', colorClass: 'text-emerald-400 hover:bg-emerald-500/10', onClick: () => doRestore(listing) }]
                            : [
                                listing.isHidden
                                  ? { key: 'unhide', label: 'Approve Listing',      colorClass: 'text-emerald-400 hover:bg-emerald-500/10', onClick: () => doUnhide(listing) }
                                  : { key: 'hide',   label: 'Mark Under Review',    colorClass: 'text-amber-400 hover:bg-amber-500/10',   onClick: () => setHideTarget(listing) },
                                { key: 'feature', label: listing.featured ? 'Unfeature Listing' : 'Feature Listing', colorClass: 'text-indigo-400 hover:bg-indigo-500/10', onClick: () => (listing.featured ? doFeature(listing) : setFeatureTarget(listing)) },
                                { key: 'remove', label: 'Remove Listing', colorClass: 'text-rose-400 hover:bg-rose-500/10', onClick: () => setRemoveTarget(listing) },
                              ]),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.pages}
              <span className="ml-2 text-slate-600">({pagination.total} total)</span>
            </p>
            <div className="flex gap-1">
              <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</PageBtn>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = page <= 3
                  ? i + 1
                  : page >= pagination.pages - 2
                    ? pagination.pages - 4 + i
                    : page - 2 + i
                if (p < 1 || p > pagination.pages) return null
                return <PageBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PageBtn>
              })}
              <PageBtn onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</PageBtn>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {hideTarget && (
        <HideListingModal
          listing={hideTarget}
          onConfirm={doHide}
          onCancel={() => setHideTarget(null)}
          busy={actionBusy}
        />
      )}
      {removeTarget && (
        <RemoveListingModal
          listing={removeTarget}
          onConfirm={doRemove}
          onCancel={() => setRemoveTarget(null)}
          busy={actionBusy}
        />
      )}
      {featureTarget && (
        <FeatureListingModal
          listing={featureTarget}
          onConfirm={(reason) => doFeature(featureTarget, reason)}
          onCancel={() => setFeatureTarget(null)}
          busy={actionBusy}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl transition-all ${
          toast.startsWith('✓') ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' : 'bg-rose-900 text-rose-300 border border-rose-700'
        }`}>
          {toast}
        </div>
      )}
    </div>
  )
}
