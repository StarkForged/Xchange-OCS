import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAdminListingByIdAPI,
  hideListingAPI,
  unhideListingAPI,
  removeListingAPI,
  restoreListingAPI,
  featureListingAPI,
  dismissReportAPI,
  addAdminNoteAPI,
} from '../../../api/admin.api'
import { HideListingModal, RemoveListingModal, FeatureListingModal } from './ModerationModals'

const formatPrice = (p) => p?.amount != null ? `₹${p.amount.toLocaleString('en-IN')}` : '—'

const formatDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const REASON_LABELS = {
  spam: 'Spam', duplicate: 'Duplicate Listing', fraudulent: 'Fraudulent Listing',
  inappropriate: 'Inappropriate Content', misleading: 'Misleading Information',
  counterfeit: 'Counterfeit Item', other: 'Other',
}

const PRIORITY_STYLES = {
  low:      'bg-sky-500/10    text-sky-400    border-sky-500/20',
  medium:   'bg-amber-500/10  text-amber-400  border-amber-500/20',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-rose-500/10   text-rose-400   border-rose-500/20',
}

const TIMELINE_META = {
  created:    { label: 'Created',    icon: '＋', color: 'text-slate-300' },
  reported:   { label: 'Reported',   icon: '⚠', color: 'text-rose-400' },
  hidden:     { label: 'Marked Under Review', icon: '◐', color: 'text-amber-400' },
  unhidden:   { label: 'Approved',            icon: '◑', color: 'text-emerald-400' },
  removed:    { label: 'Removed',    icon: '✕', color: 'text-rose-400' },
  restored:   { label: 'Restored',   icon: '↺', color: 'text-emerald-400' },
  featured:   { label: 'Featured',   icon: '★', color: 'text-indigo-400' },
  unfeatured: { label: 'Unfeatured', icon: '☆', color: 'text-slate-400' },
}

function PriorityBadge({ priority }) {
  if (!priority || priority === 'none') return null
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.low
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${s}`}>
      {priority} Priority
    </span>
  )
}

function Section({ title, children }) {
  return (
    <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  )
}

function StatTile({ label, value }) {
  return (
    <div className="bg-slate-900 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}

function EmptyRow({ text }) {
  return (
    <div className="text-center py-6">
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  )
}

function ReportRow({ report, onDismiss, onHide, onRemove, busy }) {
  const statusStyle = {
    pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dismissed: 'bg-slate-700 text-slate-400 border-slate-600',
    actioned:  'bg-rose-500/10 text-rose-400 border-rose-500/20',
  }[report.status]

  return (
    <div className="bg-slate-900 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">{report.reporter?.name || 'Unknown user'}</p>
          <p className="text-[10px] text-slate-500">{report.reporter?.email}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${statusStyle}`}>
          {report.status}
        </span>
      </div>
      <p className="text-xs text-slate-300">
        <span className="font-semibold text-rose-400">{REASON_LABELS[report.reason] || report.reason}</span>
        {report.comment && <span className="text-slate-400"> — {report.comment}</span>}
      </p>
      <p className="text-[10px] text-slate-500">{formatDateTime(report.createdAt)}</p>

      {report.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onDismiss(report._id)}
            disabled={busy}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            onClick={onHide}
            disabled={busy}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            Mark Under Review
          </button>
          <button
            onClick={onRemove}
            disabled={busy}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
          >
            Remove Listing
          </button>
        </div>
      )}
    </div>
  )
}

function TimelineRow({ event }) {
  const meta = TIMELINE_META[event.action] || { label: event.action, icon: '•', color: 'text-slate-400' }
  return (
    <div className="flex gap-3">
      <div className={`w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 text-xs ${meta.color}`}>
        {meta.icon}
      </div>
      <div className="min-w-0 pb-3 border-l border-slate-800 -ml-3 pl-6 -mt-1">
        <p className="text-xs font-semibold text-slate-200">{meta.label}</p>
        <p className="text-[10px] text-slate-500">
          {formatDateTime(event.createdAt)}
          {event.by?.name && <span> · {event.by.name}</span>}
        </p>
        {event.reason && <p className="text-[11px] text-slate-400 mt-0.5">{event.reason}</p>}
      </div>
    </div>
  )
}

export default function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [listing, setListing]   = useState(null)
  const [reports, setReports]   = useState([])
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState('')
  const [activeImage, setActiveImage] = useState(0)
  const [busy,    setBusy]      = useState(false)
  const [toast,   setToast]     = useState('')
  const [showHide,    setShowHide]    = useState(false)
  const [showRemove,  setShowRemove]  = useState(false)
  const [showFeature, setShowFeature] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminListingByIdAPI(id)
      setListing(data.listing)
      setReports(data.reports || [])
      setTimeline(data.timeline || [])
      setActiveImage(0)
    } catch (e) {
      setError(e.message || 'Failed to load listing')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const doHide = async (reason, note) => {
    setBusy(true)
    try {
      const data = await hideListingAPI(id, reason, note)
      setListing((prev) => ({ ...prev, ...data.listing }))
      showToast('✓ Listing hidden')
      load()
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setBusy(false)
      setShowHide(false)
    }
  }

  const doUnhide = async () => {
    setBusy(true)
    try {
      const data = await unhideListingAPI(id)
      setListing((prev) => ({ ...prev, ...data.listing }))
      showToast('✓ Listing unhidden')
      load()
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const doRemove = async (reason) => {
    setBusy(true)
    try {
      await removeListingAPI(id, 'DELETE', reason)
      showToast('✓ Listing removed')
      setShowRemove(false)
      load()
    } catch (e) {
      showToast(`✗ ${e.message}`)
      setBusy(false)
    }
  }

  const doRestore = async () => {
    setBusy(true)
    try {
      const data = await restoreListingAPI(id)
      setListing((prev) => ({ ...prev, ...data.listing }))
      showToast('✓ Listing restored')
      load()
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const doFeature = async (reason = '') => {
    setBusy(true)
    try {
      const data = await featureListingAPI(id, !listing.featured, null, reason)
      setListing((prev) => ({ ...prev, ...data.listing }))
      showToast(data.listing.featured ? '✓ Listing featured' : '✓ Listing unfeatured')
      load()
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setBusy(false)
      setShowFeature(false)
    }
  }

  const doDismissReport = async (reportId) => {
    setBusy(true)
    try {
      await dismissReportAPI(reportId)
      setReports((prev) => prev.map((r) => (r._id === reportId ? { ...r, status: 'dismissed' } : r)))
      showToast('✓ Report dismissed')
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const doAddNote = async () => {
    if (!noteText.trim()) return
    setNoteBusy(true)
    try {
      const data = await addAdminNoteAPI(id, noteText.trim())
      setListing((prev) => ({ ...prev, adminNotes: data.adminNotes }))
      setNoteText('')
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setNoteBusy(false)
    }
  }

  if (loading) {
    return <div className="max-w-5xl space-y-4 animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-1/3" />
      <div className="h-64 bg-slate-800 rounded-2xl" />
    </div>
  }

  if (error || !listing) {
    return (
      <div className="max-w-5xl">
        <p className="text-sm text-red-400">{error || 'Listing not found'}</p>
        <button onClick={() => navigate('/admin/listings')} className="mt-3 text-xs text-indigo-400 hover:underline">
          ← Back to listings
        </button>
      </div>
    )
  }

  const tx = listing.transaction
  const isRemoved = listing.status === 'removed'

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => navigate('/admin/listings')} className="text-xs text-slate-500 hover:text-slate-300 mb-2">
            ← Back to listings
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">{listing.title}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {isRemoved && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Removed</span>}
            {listing.isHidden && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">Under Review</span>}
            {listing.status === 'sold' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">Sold</span>}
            {listing.featured && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">★ Featured</span>}
            <PriorityBadge priority={listing.reportPriority} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.open(`/listings/${listing._id}`, '_blank')} className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">
            Open Listing
          </button>
          {isRemoved ? (
            <button onClick={doRestore} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
              Restore Listing
            </button>
          ) : (
            <>
              <button
                onClick={() => (listing.featured ? doFeature() : setShowFeature(true))}
                disabled={busy}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
              >
                {listing.featured ? 'Unfeature' : 'Feature'}
              </button>
              {listing.isHidden ? (
                <button onClick={doUnhide} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                  Approve
                </button>
              ) : (
                <button onClick={() => setShowHide(true)} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                  Mark Under Review
                </button>
              )}
              <button onClick={() => setShowRemove(true)} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      {isRemoved && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-xs text-rose-300">
          <p className="font-bold tracking-wide">REMOVED BY ADMINISTRATOR</p>
          <p className="mt-1">Removed by <strong>{listing.removedBy?.name || 'admin'}</strong> on {formatDateTime(listing.removedAt)}
          {listing.removedReason && <> — {listing.removedReason}</>}</p>
        </div>
      )}
      {listing.isHidden && !isRemoved && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300">
          <p className="font-bold tracking-wide">UNDER REVIEW</p>
          <p className="mt-1">Flagged by <strong>{listing.hiddenBy?.name || 'admin'}</strong> on {formatDateTime(listing.hiddenAt)} — {listing.hiddenReason}</p>
          <p className="mt-1">This listing is unavailable to buyers while under review. The seller cannot resume, pause, or edit it until it's approved.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <Section title="Images">
            <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden">
              {listing.images?.[activeImage] && (
                <img src={listing.images[activeImage]} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            {listing.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {listing.images.map((src, i) => (
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
          </Section>

          {/* Description */}
          <Section title="Description">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Price</p>
                <p className="text-sm font-bold text-white">{formatPrice(listing.price)}{listing.price?.negotiable && <span className="text-emerald-400 text-xs ml-2">Negotiable</span>}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Category</p>
                <p className="text-sm font-bold text-white">{listing.category?.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Location</p>
                <p className="text-sm text-slate-300">
                  {[listing.location?.area, listing.location?.city, listing.location?.state].filter(Boolean).join(', ')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Condition</p>
                <p className="text-sm text-slate-300 capitalize">{listing.condition?.replace('_', ' ')}</p>
              </div>
            </div>
          </Section>

          {/* Attributes */}
          {listing.attributes && Object.keys(listing.attributes).length > 0 && (
            <Section title="Attributes">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(listing.attributes).map(([key, value]) => (
                  <div key={key} className="bg-slate-900 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{key}</p>
                    <p className="text-sm font-semibold text-slate-200">{String(value) || '—'}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Reports */}
          <Section title={`Reports (${reports.length})`}>
            {reports.length === 0 ? (
              <EmptyRow text="No reports on this listing." />
            ) : (
              <div className="space-y-2">
                {reports.map((r) => (
                  <ReportRow
                    key={r._id}
                    report={r}
                    busy={busy}
                    onDismiss={doDismissReport}
                    onHide={() => setShowHide(true)}
                    onRemove={() => setShowRemove(true)}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Admin Notes — internal only, never shown to buyers/sellers */}
          <Section title="Admin Notes (Internal Only)">
            <div className="space-y-2">
              <textarea
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder='e.g. "Possible fraud", "Warned seller", "Pending verification"…'
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={doAddNote}
                disabled={noteBusy || !noteText.trim()}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              >
                {noteBusy ? 'Adding…' : 'Add Note'}
              </button>
            </div>

            {listing.adminNotes?.length > 0 ? (
              <div className="space-y-2 pt-2">
                {[...listing.adminNotes].reverse().map((n, i) => (
                  <div key={i} className="bg-slate-900 rounded-xl p-3">
                    <p className="text-xs text-slate-200">{n.text}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {n.addedBy?.name || 'Admin'} · {formatDateTime(n.addedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyRow text="No internal notes yet." />
            )}
          </Section>
        </div>

        <div className="space-y-6">
          {/* Seller */}
          <Section title="Seller">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-700 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-white">{listing.seller?.name?.[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{listing.seller?.name}</p>
                <p className="text-xs text-slate-400 truncate">{listing.seller?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {listing.seller?.isVerifiedSeller && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">✓ Verified Seller</span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                Trust {listing.seller?.trustScore ?? 0}/100
              </span>
            </div>
            <button
              onClick={() => navigate(`/admin/users?search=${encodeURIComponent(listing.seller?.email || '')}`)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Seller Profile
            </button>
          </Section>

          {/* Stats */}
          <Section title="Listing Statistics">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Views"   value={listing.stats?.views ?? 0} />
              <StatTile label="Saves"   value={listing.stats?.saves ?? 0} />
              <StatTile label="Chats"   value={listing.stats?.chats ?? 0} />
              <StatTile label="Reports" value={listing.stats?.reports ?? 0} />
            </div>
            <div className="space-y-1 pt-1 text-xs">
              <p className="flex justify-between text-slate-400"><span>Created</span><span className="text-slate-300">{formatDateTime(listing.createdAt)}</span></p>
              <p className="flex justify-between text-slate-400"><span>Updated</span><span className="text-slate-300">{formatDateTime(listing.updatedAt)}</span></p>
            </div>
          </Section>

          {/* Transaction */}
          <Section title="Transaction">
            {!tx?.buyer ? (
              <EmptyRow text="No transaction yet." />
            ) : (
              <div className="space-y-2 text-xs">
                <p className="flex justify-between text-slate-400"><span>Buyer</span><span className="text-slate-200 font-semibold">{tx.buyer?.name}</span></p>
                <p className="flex justify-between text-slate-400"><span>Status</span><span className="text-slate-200 font-semibold capitalize">{listing.status}</span></p>
                <p className="flex justify-between text-slate-400"><span>Completed</span><span className="text-slate-200">{tx.completedAt ? formatDateTime(tx.completedAt) : 'Pending'}</span></p>
                <p className="flex justify-between text-slate-400">
                  <span>Reviews</span>
                  <span className="text-slate-200">
                    {listing.reviewStatus?.reviewsUnlocked
                      ? `${listing.reviewStatus.reviewCount} submitted`
                      : 'Locked'}
                  </span>
                </p>
              </div>
            )}
          </Section>

          {/* Moderation Timeline — newest first */}
          <Section title="Moderation Timeline">
            {timeline.length === 0 ? (
              <EmptyRow text="No moderation activity yet." />
            ) : (
              <div>
                {timeline.map((event) => <TimelineRow key={event._id} event={event} />)}
              </div>
            )}
          </Section>
        </div>
      </div>

      {showHide && (
        <HideListingModal listing={listing} onConfirm={doHide} onCancel={() => setShowHide(false)} busy={busy} />
      )}
      {showRemove && (
        <RemoveListingModal listing={listing} onConfirm={doRemove} onCancel={() => setShowRemove(false)} busy={busy} />
      )}
      {showFeature && (
        <FeatureListingModal listing={listing} onConfirm={doFeature} onCancel={() => setShowFeature(false)} busy={busy} />
      )}

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
