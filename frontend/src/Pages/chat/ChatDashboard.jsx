import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import { getConversations, getMessages } from '../../features/chat/chat.service'
import { updateListingStatusAPI, confirmTransactionAPI, cancelTransactionAPI } from '../../api/listings.api'
import { createReviewAPI } from '../../api/review.api'
import { getSocket } from '../../socket'
import defaultAvatar from '../../assets/images/default-avatar.jpg'
import defaultImage from '../../assets/images/products/iphone13.jpg'

// ── Helpers ───────────────────────────────────────────────────────────────

const timeAgo = (ts) => {
  if (!ts) return ''
  const diff  = Date.now() - new Date(ts)
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'Now'
  if (mins  < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days  < 7)  return `${days}d`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const formatTime = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const formatDateLabel = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const buildGroups = (msgs) => {
  const items = []
  let lastDate = null
  msgs.forEach((msg) => {
    const d = new Date(msg.timestamp).toDateString()
    if (d !== lastDate) {
      items.push({ type: 'separator', id: `sep_${d}`, label: formatDateLabel(msg.timestamp) })
      lastDate = d
    }
    items.push({ type: 'msg', ...msg })
  })
  return items
}

// Keep deleted messages even though their text is a placeholder
const dedup = (msgs) => {
  const seen = new Set()
  return msgs.filter((m) => {
    if (!m?.id) return false
    if (!m.isDeleted && !m?.text?.trim()) return false
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

// ── Sub-components ────────────────────────────────────────────────────────

function SidebarSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-2.5 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  )
}

function EmptyPanel({ onBrowse }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 bg-gray-50/60">
      <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-gray-600 text-base mb-1.5">Your Messages</p>
        <p className="text-sm text-gray-400 leading-relaxed max-w-[220px]">
          Select a conversation to start chatting
        </p>
      </div>
      <button onClick={onBrowse} className="mt-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
        Browse listings →
      </button>
    </div>
  )
}

function EmptyTab({ tab, onBrowse }) {
  const isBuying = tab === 'buying'
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-600 mb-1">
          {isBuying ? 'No buying conversations' : 'No selling conversations'}
        </p>
        <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
          {isBuying
            ? 'Browse listings and message a seller to get started'
            : 'Buyers will appear here when they message you about your listings'}
        </p>
      </div>
      {isBuying && (
        <button onClick={onBrowse} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
          Browse listings →
        </button>
      )}
    </div>
  )
}

function MessageMenu({ item, mine, onCopy, onDelete }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`
        absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]
        ${mine ? 'right-0' : 'left-0'} bottom-full mb-1
      `}
    >
      {!item.isDeleted && (
        <button
          onClick={onCopy}
          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Message
        </button>
      )}
      {mine && !item.isDeleted && (
        <button
          onClick={onDelete}
          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Message
        </button>
      )}
    </div>
  )
}

// ── Mark Sold Confirmation Modal ─────────────────────────────────────────────

function MarkSoldModal({ listing, buyer, listingStatus, onPause, onConfirm, onCancel, busy }) {
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
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <img src={buyer?.profileImage || defaultAvatar} alt={buyer?.name} className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buyer</p>
              <p className="text-sm font-bold text-gray-900 truncate">{buyer?.name || 'Unknown'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <img src={listing?.images?.[0] || defaultImage} alt={listing?.title} className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Listing</p>
              <p className="text-sm font-bold text-gray-900 truncate">{listing?.title}</p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {['Listing removed from marketplace search','New buyer chats are blocked','Reviews locked until both parties confirm'].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />{item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
            If the exchange hasn't happened yet, consider <strong>pausing</strong> the listing instead.
          </p>
        </div>
        <div className="px-6 pb-6 space-y-2">
          <button onClick={onConfirm} disabled={busy} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
            {busy ? 'Marking sold…' : 'Confirm Sold'}
          </button>
          {listingStatus !== 'paused' && (
            <button onClick={onPause} disabled={busy} className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-sm font-semibold transition-colors disabled:opacity-50">
              Pause Listing Instead
            </button>
          )}
          {listingStatus === 'paused' && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center font-medium">
              Listing is currently paused — confirming will mark it sold.
            </div>
          )}
          <button onClick={onCancel} disabled={busy} className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Transaction Panel (dashboard inline version) ──────────────────────────────

const CANCEL_REASONS = {
  buyer:  ['Seller stopped responding', 'Seller did not show up', 'Item different than described', 'Found another item', 'No longer interested', 'Other'],
  seller: ['Buyer stopped responding', 'Buyer did not show up', 'Buyer changed mind', 'Item unavailable', 'Other'],
}

function CancellationReasonModal({ role, onConfirm, onClose, busy }) {
  const [selected, setSelected] = useState('')
  const [other,    setOther]    = useState('')
  const reasons = CANCEL_REASONS[role] || CANCEL_REASONS.buyer
  const finalReason = selected === 'Other' ? other.trim() : selected

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Close">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="bg-rose-50 border-b border-rose-100 px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900">Cancel Transaction</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500">Select a reason. This will be recorded and affect your completion rate.</p>
          <div className="space-y-1.5">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setSelected(r)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  selected === r
                    ? 'border-rose-400 bg-rose-50 text-rose-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {selected === 'Other' && (
            <textarea
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Describe the reason…"
              rows={2}
              className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-rose-200"
            />
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Keep Transaction
          </button>
          <button
            onClick={() => finalReason && onConfirm(finalReason)}
            disabled={!finalReason || busy}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
          >
            {busy ? 'Cancelling…' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardTransactionPanel({
  listingId, listing, listingStatus, transaction,
  buyerParticipant, currentUserId, txBuyerInChat,
  onMarkSold, onPause, onResume, onConfirmTransaction, onCancelTransaction,
  actionBusy,
}) {
  const [reviewDone,      setReviewDone]      = useState(false)
  const [reviewBusy,      setReviewBusy]      = useState(false)
  const [reviewError,     setReviewError]     = useState('')
  const [rating,          setRating]          = useState(0)
  const [hoverRating,     setHoverRating]     = useState(0)
  const [comment,         setComment]         = useState('')
  const [txConfirmed,     setTxConfirmed]     = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // ── Role derived entirely from stored IDs — never from participant ordering ──
  const meStr    = currentUserId ? String(currentUserId) : ''
  // sellerId stored by chat.service as a top-level string on the listing object
  const sellerStr = listing?.sellerId
    ? String(listing.sellerId)
    : listing?.seller
      ? String(listing.seller._id ?? listing.seller)
      : ''
  const buyerStr  = transaction?.buyer ? String(transaction.buyer) : ''

  const isSeller        = meStr !== '' && meStr === sellerStr
  const isSelectedBuyer = buyerStr !== '' && meStr === buyerStr
  // Seller is only a transaction participant in the chat that belongs to the selected buyer.
  // txBuyerInChat (passed from ChatDashboard) is false when viewing an unrelated buyer's chat.
  const isParticipant   = (isSeller && txBuyerInChat) || isSelectedBuyer

  const myConfirmed   = isSeller ? transaction?.sellerConfirmed : transaction?.buyerConfirmed
  const dealCompleted = !!(transaction?.completedAt)

  const handleSubmitReview = async () => {
    if (!rating) { setReviewError('Please select a rating'); return }
    setReviewBusy(true)
    setReviewError('')
    try {
      await createReviewAPI({ listingId, rating, comment })
      setReviewDone(true)
    } catch (e) {
      setReviewError(e?.response?.data?.message || 'Failed to submit')
    } finally {
      setReviewBusy(false)
    }
  }

  // ── ACTIVE ────────────────────────────────────────────────────────────────
  if (listingStatus === 'active') {
    if (!isSeller) return null
    return (
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
          </span>
          <div className="flex-1" />
          <Link to={`/listings/${listingId}`} className="text-xs font-semibold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
            View Listing
          </Link>
          <button onClick={onPause} disabled={actionBusy} className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            Pause
          </button>
          <button onClick={onMarkSold} disabled={actionBusy} className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            Mark Sold
          </button>
        </div>
      </div>
    )
  }

  // ── PAUSED ────────────────────────────────────────────────────────────────
  if (listingStatus === 'paused') {

    // Paused due to a cancelled transaction — show cancellation details
    if (transaction?.cancelled) {
      const cancelledByStr = transaction.cancelledBy ? String(transaction.cancelledBy) : null
      // Role label derived purely from stored IDs — no participant lookup needed
      const cancelledByLabel =
        cancelledByStr === meStr     ? 'You' :
        cancelledByStr === buyerStr  ? 'the buyer' :
        cancelledByStr === sellerStr ? 'the seller' :
        'a participant'

      return (
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-200 border border-gray-300 px-2 py-0.5 rounded-full">
              Transaction Cancelled
            </span>
            {isSeller && (
              <>
                <div className="flex-1" />
                <button onClick={onResume} disabled={actionBusy} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  Resume Listing
                </button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span>Cancelled by: <span className="font-semibold text-gray-700">{cancelledByLabel}</span></span>
            {transaction.cancellationReason && (
              <span>Reason: <span className="font-semibold text-gray-700">{transaction.cancellationReason}</span></span>
            )}
          </div>
          {isSeller && (
            <p className="text-[11px] text-gray-400">Listing is paused. Resume when ready to relist or sell to someone else.</p>
          )}
        </div>
      )
    }

    return (
      <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Paused
          </span>
          {isSeller && (
            <span className="text-xs text-amber-700 font-medium">Reserved · not publicly visible</span>
          )}
          {isSeller && (
            <>
              <div className="flex-1" />
              <button onClick={onResume} disabled={actionBusy} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                Resume
              </button>
              <button onClick={onMarkSold} disabled={actionBusy} className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                Mark Sold
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── SOLD ──────────────────────────────────────────────────────────────────
  if (listingStatus === 'sold') {

    // Non-participant viewing a sold listing: neutral banner, no transaction controls.
    // isParticipant = (isSeller && txBuyerInChat) || isSelectedBuyer ensures only the
    // actual transaction parties see transaction UI.
    if (!isParticipant) {
      return (
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500 font-medium">This listing has been sold to another buyer.</span>
          </div>
        </div>
      )
    }

    if (dealCompleted) {
      return (
        <div className="flex-shrink-0 bg-emerald-50 border-b border-emerald-200 px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">Sold</span>
            <span className="text-xs text-emerald-700 font-semibold">Deal Closed Successfully</span>
          </div>
          {isParticipant && !reviewDone && (
            <div className="bg-white rounded-xl border border-emerald-200 p-3 space-y-2.5">
              <p className="text-xs font-bold text-gray-700">Leave a Review</p>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="transition-transform hover:scale-110">
                    <svg className={`w-6 h-6 transition-colors ${star <= (hoverRating || rating) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                {rating > 0 && <span className="ml-1 text-xs font-semibold text-amber-700">{['','Poor','Fair','Good','Very Good','Excellent'][rating]}</span>}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)…" rows={2} className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-emerald-300 placeholder-gray-400" />
              {reviewError && <p className="text-xs text-red-600 font-medium">{reviewError}</p>}
              <button onClick={handleSubmitReview} disabled={reviewBusy || !rating} className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-40">
                {reviewBusy ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          )}
          {reviewDone && (
            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Review submitted. Thank you!
            </p>
          )}
        </div>
      )
    }

    return (
      <>
        {showCancelModal && (
          <CancellationReasonModal
            role={isSeller ? 'seller' : 'buyer'}
            onConfirm={async (reason) => {
              await onCancelTransaction(reason)
              setShowCancelModal(false)
            }}
            onClose={() => setShowCancelModal(false)}
            busy={actionBusy}
          />
        )}
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Sold
            </span>
            {/* Seller sees buyer name; only the selected buyer sees the confirmation label */}
            {transaction?.buyer && isSeller && (
              <span className="text-xs text-amber-700 font-medium">
                Buyer: <span className="font-bold">{buyerParticipant?.name || 'Buyer'}</span>
              </span>
            )}
            {transaction?.buyer && isSelectedBuyer && (
              <span className="text-xs text-amber-700 font-medium">You are the selected buyer</span>
            )}
            <span className="text-xs text-amber-600 font-medium">· Waiting for confirmations</span>
          </div>
          {isParticipant && (
            myConfirmed || txConfirmed ? (
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Your confirmation recorded — waiting for the other party.
              </p>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={async () => { try { await onConfirmTransaction(); setTxConfirmed(true) } catch {} }}
                  disabled={actionBusy}
                  className="flex-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionBusy ? 'Working…' : 'Confirm Completed'}
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={actionBusy}
                  className="flex-1 text-xs font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 border border-gray-200 hover:border-red-300 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel Transaction
                </button>
              </div>
            )
          )}
        </div>
      </>
    )
  }

  return null
}

// ── Main component ────────────────────────────────────────────────────────

export default function ChatDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Sidebar
  const [conversations, setConversations] = useState([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [activeTab, setActiveTab]         = useState('buying') // 'buying' | 'selling'
  const [activeId, setActiveId]           = useState(null)     // listingId
  const [activeChatId, setActiveChatId]   = useState(null)

  // Active chat
  const [activeMessages, setActiveMessages]       = useState([])
  const [loadingChat, setLoadingChat]             = useState(false)
  const [inputText, setInputText]                 = useState('')

  // Transaction controls for the active conversation
  const [activeListingStatus, setActiveListingStatus] = useState('active')
  const [activeTransaction,   setActiveTransaction]   = useState(null)
  const [showSoldModal,       setShowSoldModal]       = useState(false)
  const [actionBusy,          setActionBusy]          = useState(false)

  // Message action menu
  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const [menuMsgId, setMenuMsgId]       = useState(null)

  const bottomRef       = useRef(null)
  const inputRef        = useRef(null)
  const activeChatIdRef = useRef(null)
  // Stable ref so socket callbacks always see the current activeId without
  // needing to be recreated (avoids stale-closure wrong-chat placement).
  const activeIdRef     = useRef(null)

  // Keep stable ref in sync so socket callbacks can read the current value
  // without the effect needing to be recreated on every activeId change.
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  // ── Load conversation list ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingConvos(true)
      try {
        const convos = await getConversations()
        if (!cancelled) setConversations(convos)
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingConvos(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Load messages when active conversation changes ─────────────────────
  useEffect(() => {
    if (!activeId) return
    const chatId = activeChatIdRef.current
    if (!chatId) return
    let cancelled = false
    const load = async () => {
      setLoadingChat(true)
      setActiveMessages([])
      setInputText('')
      try {
        const msgs = await getMessages(chatId)
        if (!cancelled) {
          setActiveMessages((prev) => {
            const dbIds  = new Set(msgs.map((m) => m.id))
            const extras = prev.filter((m) => m.id && !dbIds.has(m.id))
            return dedup([...msgs, ...extras])
          })
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingChat(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeId, activeChatId])

  useEffect(() => {
    if (!loadingChat) bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [loadingChat])

  useEffect(() => {
    if (activeMessages.length > 0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length])

  // ── Socket: join room + receive messages + deletions ───────────────────
  // IMPORTANT: loadingChat is intentionally NOT in the dependency array.
  // Including it caused a leave→rejoin cycle on every conversation open,
  // creating a window where a message from the old room could arrive after
  // the new onReceive was registered but before the server leave was processed,
  // placing the wrong-chat message into activeMessages (the reported bug).
  useEffect(() => {
    if (!activeId) return
    const socket = getSocket()
    if (!socket.connected) socket.connect()
    socket.emit('join_chat', { listingId: activeId })

    const onReceive = (message) => {
      if (!message?.id || !message?.text?.trim()) return

      // Guard: discard messages that belong to a different chat.
      // This handles the race between leave_chat (async network) and the
      // server still broadcasting to the old room while React has already
      // switched activeId to the new conversation.
      const currentId = activeIdRef.current
      if (message.listingId && message.listingId !== currentId) return

      setActiveMessages((prev) => dedup([...prev, message]))

      // Use message.listingId (server-stamped) instead of the closed-over
      // activeId to correctly update the sidebar preview for the sender's
      // conversation, not the currently open one.
      setConversations((prev) =>
        prev.map((c) =>
          c.listingId === message.listingId
            ? { ...c, lastMessage: { senderId: message.senderId, text: message.text, timestamp: message.timestamp } }
            : c
        )
      )
    }

    // Server acks sender's message with real DB id — replace temp id in state
    const onSent = ({ tempId, realId, timestamp }) => {
      setActiveMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, id: realId, timestamp } : m)
      )
    }

    const onDeleted = ({ messageId }) => {
      setActiveMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, text: 'This message was deleted', isDeleted: true } : m
        )
      )
    }

    socket.on('receive_message', onReceive)
    socket.on('message_sent',    onSent)
    socket.on('message_deleted', onDeleted)
    return () => {
      socket.emit('leave_chat', { listingId: activeId })
      socket.off('receive_message', onReceive)
      socket.off('message_sent',    onSent)
      socket.off('message_deleted', onDeleted)
    }
  }, [activeId])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { return () => { getSocket().disconnect() } }, [])

  // ── Transaction actions ───────────────────────────────────────────────────

  const handleTxPause = useCallback(async () => {
    setActionBusy(true)
    setShowSoldModal(false)
    try {
      await updateListingStatusAPI(activeId, 'paused')
      setActiveListingStatus('paused')
      setConversations((prev) => prev.map((c) =>
        c.listingId === activeId ? { ...c, listing: { ...c.listing, status: 'paused' } } : c
      ))
    } catch {} finally { setActionBusy(false) }
  }, [activeId])

  const handleTxResume = useCallback(async () => {
    setActionBusy(true)
    try {
      await updateListingStatusAPI(activeId, 'active')
      setActiveListingStatus('active')
      setConversations((prev) => prev.map((c) =>
        c.listingId === activeId ? { ...c, listing: { ...c.listing, status: 'active' } } : c
      ))
    } catch {} finally { setActionBusy(false) }
  }, [activeId])

  const handleTxMarkSoldClick = useCallback(() => setShowSoldModal(true), [])

  const handleTxConfirmSold = useCallback(async () => {
    setActionBusy(true)
    try {
      const convo  = conversations.find((c) => c.chatId === activeChatId)
      const buyer  = convo?.participants?.find((p) => p._id !== String(user?._id))
      const result = await updateListingStatusAPI(activeId, 'sold', buyer?._id)
      const tx     = result.listing?.transaction || null
      setActiveListingStatus('sold')
      setActiveTransaction(tx)
      setConversations((prev) => prev.map((c) =>
        c.listingId === activeId
          ? { ...c, listing: { ...c.listing, status: 'sold', transaction: tx } }
          : c
      ))
    } catch {} finally { setActionBusy(false); setShowSoldModal(false) }
  }, [activeId, conversations, user])

  const handleTxPauseFromModal = useCallback(async () => {
    setShowSoldModal(false)
    await handleTxPause()
  }, [handleTxPause])

  const handleTxConfirmTransaction = useCallback(async () => {
    setActionBusy(true)
    try {
      const result = await confirmTransactionAPI(activeId)
      const tx = result.listing?.transaction || null
      setActiveTransaction(result.dealCompleted
        ? { ...tx, completedAt: new Date().toISOString() }
        : tx
      )
    } finally { setActionBusy(false) }
  }, [activeId])

  const handleTxCancelTransaction = useCallback(async (reason) => {
    setActionBusy(true)
    try {
      const result = await cancelTransactionAPI(activeId, reason)
      const tx = result.listing?.transaction || null
      setActiveTransaction(tx)
      // Listing moves to paused — seller must explicitly resume
      setActiveListingStatus('paused')
      setConversations((prev) => prev.map((c) =>
        c.listingId === activeId
          ? { ...c, listing: { ...c.listing, status: 'paused', transaction: tx } }
          : c
      ))
    } catch {} finally { setActionBusy(false) }
  }, [activeId])

  // ── Send ───────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim()
    if (!text || !user || !activeChatIdRef.current) return
    const newMsg = {
      id:        `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      senderId:  String(user._id),
      text,
      timestamp: new Date().toISOString(),
      isDeleted: false,
    }
    setActiveMessages((prev) => dedup([...prev, newMsg]))
    setInputText('')
    inputRef.current?.focus()
    getSocket().emit('send_message', { listingId: activeId, chatId: activeChatIdRef.current, message: newMsg })
    setConversations((prev) =>
      prev.map((c) =>
        c.listingId === activeId
          ? { ...c, lastMessage: { senderId: newMsg.senderId, text: newMsg.text, timestamp: newMsg.timestamp } }
          : c
      )
    )
  }, [inputText, user, activeId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Delete (optimistic + socket) ───────────────────────────────────────
  const handleDeleteMessage = useCallback((msg) => {
    setMenuMsgId(null)
    if (!activeChatIdRef.current) return
    setActiveMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, text: 'This message was deleted', isDeleted: true } : m
      )
    )
    getSocket().emit('delete_message', {
      messageId: msg.id,
      chatId:    activeChatIdRef.current,
      listingId: activeId,
      userId:    String(user?._id),
    })
  }, [activeId, user])

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setMenuMsgId(null)
  }

  // ── Derived ────────────────────────────────────────────────────────────
  const isMine   = (msg) => String(msg.senderId) === String(user?._id)
  const isUnread = (c)   => c.lastMessage != null && String(c.lastMessage.senderId) !== String(user?._id)
  const getPreview = (c) => {
    const m = c.lastMessage
    if (!m?.text?.trim()) return 'No messages yet'
    if (m.text === 'This message was deleted') return 'Message deleted'
    return String(m.senderId) === String(user?._id) ? `You: ${m.text}` : m.text
  }

  // Split by role
  const buyingConvos  = conversations.filter((c) => c.sellerId !== String(user?._id))
  const sellingConvos = conversations.filter((c) => c.sellerId === String(user?._id))
  const tabConvos     = activeTab === 'buying' ? buyingConvos : sellingConvos

  // Active chat derived data — keyed by chatId, not listingId.
  // Two buyers for the same listing share a listingId; only chatId is unique.
  const activeConvo      = conversations.find((c) => c.chatId === activeChatId)
  const activeListing    = activeConvo?.listing || null
  const otherParticipant = activeConvo?.participants?.find((p) => p._id !== String(user?._id))
  const otherName        = otherParticipant?.name || 'User'

  // isSeller: the current user owns this listing
  const isSeller = activeConvo?.sellerId === String(user?._id)

  // Resolve buyer from transaction.buyer ID, not "other participant".
  // otherParticipant is the SELLER when the buyer views — using it directly
  // would show the wrong name. Match by transaction.buyer ID instead.
  const txBuyerStr       = activeTransaction?.buyer ? String(activeTransaction.buyer) : null
  const participantMatch = txBuyerStr
    ? activeConvo?.participants?.find((p) => p._id === txBuyerStr)
    : null
  const txBuyerParticipant = participantMatch ?? otherParticipant

  // True when the transaction buyer is a participant in THIS specific chat (or no buyer is set yet).
  // Gates all transaction controls: seller only sees them in Buyer A's chat, not Buyer B's/C's.
  const isCurrentChatTransactionChat = txBuyerStr === null || participantMatch !== null

  // Pass sellerId through to the panel so it can compute participant identity
  const listingForPanel = activeListing
    ? { ...activeListing, sellerId: activeConvo?.sellerId || '' }
    : null

  const grouped    = buildGroups(activeMessages)
  const canSend    = inputText.trim().length > 0
  const listingImg = activeListing?.images?.[0] ?? defaultImage
  const isSold     = activeListingStatus === 'sold'

  return (
    <>
    {showSoldModal && (
      <MarkSoldModal
        listing={activeListing}
        buyer={txBuyerParticipant}
        listingStatus={activeListingStatus}
        onConfirm={handleTxConfirmSold}
        onPause={handleTxPauseFromModal}
        onCancel={() => setShowSoldModal(false)}
        busy={actionBusy}
      />
    )}
    <div
      className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden"
      onClick={() => setMenuMsgId(null)}
    >

      {/* ═══════════════════════════════════════
          LEFT SIDEBAR
      ═══════════════════════════════════════ */}
      <aside className={`
        flex-shrink-0 w-full md:w-[320px] border-r border-gray-200 flex flex-col bg-white
        ${activeId ? 'hidden md:flex' : 'flex'}
      `}>

        {/* Sidebar header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h1>
            <button
              onClick={() => navigate('/listings')}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors"
              title="Browse listings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Buying / Selling tab bar */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { id: 'buying',  label: 'Buying',  count: buyingConvos.length },
              { id: 'selling', label: 'Selling', count: sellingConvos.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setActiveId(null) // close open chat when switching tabs
                }}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg
                  text-sm font-semibold transition-all duration-150
                  ${activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                {tab.label}
                {!loadingConvos && tab.count > 0 && (
                  <span className={`
                    text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                    ${activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-gray-200 text-gray-500'}
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">

          {loadingConvos && (
            <>{[1, 2, 3].map((i) => <SidebarSkeleton key={i} />)}</>
          )}

          {!loadingConvos && tabConvos.length === 0 && (
            <EmptyTab tab={activeTab} onBrowse={() => navigate('/listings')} />
          )}

          {!loadingConvos && tabConvos.map((convo) => {
            const unread    = isUnread(convo)
            const isActive  = activeChatId === convo.chatId
            // Always show the OTHER participant's name and role label
            const other     = convo.participants?.find((p) => p._id !== String(user?._id))
            const otherLabel= activeTab === 'buying' ? 'Seller' : 'Buyer'

            return (
              <button
                key={convo.chatId}
                onClick={() => {
                  setActiveId(convo.listingId)
                  setActiveChatId(convo.chatId)
                  activeChatIdRef.current = convo.chatId
                  setActiveListingStatus(convo.listing?.status || 'active')
                  setActiveTransaction(convo.listing?.transaction || null)
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 text-left
                  border-l-[3px] transition-colors duration-150
                  ${isActive
                    ? 'bg-indigo-50/80 border-l-indigo-500'
                    : 'hover:bg-gray-50 border-l-transparent'}
                `}
              >
                {/* Listing image as avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={convo.listing?.images?.[0] ?? defaultImage}
                    alt={convo.listing?.title}
                    className="w-12 h-12 rounded-full object-cover shadow-sm"
                  />
                  {unread && !isActive && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Text block */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: participant name + timestamp */}
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <p className={`text-sm truncate ${
                      unread && !isActive ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                    }`}>
                      {other?.name || 'User'}
                    </p>
                    <span className={`text-[10px] flex-shrink-0 tabular-nums ${
                      unread && !isActive ? 'font-bold text-indigo-500' : 'text-gray-400'
                    }`}>
                      {timeAgo(convo.lastMessage?.timestamp)}
                    </span>
                  </div>

                  {/* Row 2: role label + listing title + sold badge */}
                  <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                    <p className="text-[11px] text-indigo-500 font-medium truncate">
                      {otherLabel} · {convo.listing?.title || 'Listing'}
                    </p>
                    {convo.listing?.status === 'sold' && (
                      <span className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wide">
                        Sold
                      </span>
                    )}
                  </div>

                  {/* Row 3: message preview */}
                  <p className={`text-xs truncate leading-relaxed ${
                    unread && !isActive ? 'text-gray-700 font-medium' : 'text-gray-400'
                  }`}>
                    {getPreview(convo)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          RIGHT PANEL
      ═══════════════════════════════════════ */}
      <main className={`flex-1 flex flex-col min-w-0 ${activeId ? 'flex' : 'hidden md:flex'}`}>

        {!activeId && <EmptyPanel onBrowse={() => navigate('/listings')} />}

        {activeId && loadingChat && (
          <div className="flex-1 flex items-center justify-center gap-3 text-gray-400 bg-gray-50/60">
            <svg className="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm font-medium">Loading…</span>
          </div>
        )}

        {activeId && !loadingChat && (
          <>
            {/* Chat header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
              <div className="px-4 py-3 flex items-center gap-3">

                <button
                  onClick={() => setActiveId(null)}
                  className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="relative flex-shrink-0">
                  <img src={defaultAvatar} alt={otherName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-tight truncate">{otherName}</p>
                  <p className="text-xs text-gray-400 font-medium">
                    {activeConvo?.sellerId === String(user?._id) ? 'Buyer' : 'Seller'}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:block text-right">
                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                      <p className="text-xs text-gray-400 truncate max-w-[140px] leading-tight">
                        {activeListing?.title}
                      </p>
                      {isSold && (
                        <span className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wide">
                          Sold
                        </span>
                      )}
                    </div>
                    {activeListing?.price?.amount && (
                      <p className="text-sm font-black text-indigo-600 leading-tight">
                        ₹{activeListing.price.amount.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                  <img
                    src={listingImg}
                    alt={activeListing?.title}
                    className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Transaction / listing status panel */}
            <DashboardTransactionPanel
              listingId={activeId}
              listing={listingForPanel}
              listingStatus={activeListingStatus}
              transaction={activeTransaction}
              buyerParticipant={txBuyerParticipant}
              currentUserId={user?._id}
              txBuyerInChat={isCurrentChatTransactionChat}
              onMarkSold={handleTxMarkSoldClick}
              onPause={handleTxPause}
              onResume={handleTxResume}
              onConfirmTransaction={handleTxConfirmTransaction}
              onCancelTransaction={handleTxCancelTransaction}
              actionBusy={actionBusy}
            />

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/60">
              <div className="px-4 py-6 max-w-3xl mx-auto">

                {activeMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600 text-sm mb-1">Start the conversation</p>
                      <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                        Ask {otherName} about{' '}
                        <span className="font-medium text-gray-600">{activeListing?.title}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  {grouped.map((item, index) => {

                    if (item.type === 'separator') {
                      return (
                        <div key={item.id} className="flex items-center gap-3 py-5">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex-shrink-0 select-none">
                            {item.label}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )
                    }

                    const prev = grouped[index - 1]
                    const next = grouped[index + 1]
                    const isPrevSame = prev?.type === 'msg' && prev.senderId === item.senderId
                    const isNextSame = next?.type === 'msg' && next.senderId === item.senderId
                    const mine       = isMine(item)
                    const isMenuOpen = menuMsgId === item.id
                    const showMenu   = hoveredMsgId === item.id || isMenuOpen

                    const mineCorners = isPrevSame && isNextSame ? 'rounded-2xl rounded-r-lg'
                      : isPrevSame  ? 'rounded-2xl rounded-tr-lg'
                      : isNextSame  ? 'rounded-2xl rounded-br-lg'
                      : 'rounded-2xl rounded-br-sm'

                    const theirCorners = isPrevSame && isNextSame ? 'rounded-2xl rounded-l-lg'
                      : isPrevSame  ? 'rounded-2xl rounded-tl-lg'
                      : isNextSame  ? 'rounded-2xl rounded-bl-lg'
                      : 'rounded-2xl rounded-bl-sm'

                    const dotBtn = (
                      <div className="relative flex-shrink-0 self-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuMsgId(isMenuOpen ? null : item.id) }}
                          className={`
                            w-7 h-7 rounded-full flex items-center justify-center
                            hover:bg-gray-200 text-gray-400 transition-opacity duration-150
                            ${showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                          `}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="19" cy="12" r="1.5" />
                          </svg>
                        </button>
                        {isMenuOpen && (
                          <MessageMenu
                            item={item}
                            mine={mine}
                            onCopy={() => handleCopyMessage(item.text)}
                            onDelete={() => handleDeleteMessage(item)}
                          />
                        )}
                      </div>
                    )

                    return mine ? (
                      <div
                        key={item.id}
                        className={`flex justify-end items-end gap-1.5 ${isPrevSame ? 'mt-0.5' : 'mt-4'}`}
                        onMouseEnter={() => setHoveredMsgId(item.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        {dotBtn}
                        <div className="max-w-[68%] sm:max-w-[55%]">
                          <div className={`
                            px-4 py-2.5 shadow-sm ${mineCorners}
                            ${item.isDeleted ? 'bg-gray-100 border border-gray-200' : 'bg-indigo-600'}
                          `}>
                            <p className={`text-sm leading-relaxed break-words ${item.isDeleted ? 'text-gray-400 italic' : 'text-white'}`}>
                              {item.text}
                            </p>
                          </div>
                          {!isNextSame && (
                            <p className="text-[10px] text-gray-400 mt-1 text-right pr-1 select-none">
                              {formatTime(item.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={item.id}
                        className={`flex items-end gap-2 ${isPrevSame ? 'mt-0.5' : 'mt-4'}`}
                        onMouseEnter={() => setHoveredMsgId(item.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        {!isNextSame ? (
                          <img src={defaultAvatar} alt={otherName} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-5 shadow-sm border border-gray-200" />
                        ) : (
                          <div className="w-7 flex-shrink-0" />
                        )}
                        <div className="max-w-[68%] sm:max-w-[55%]">
                          <div className={`
                            px-4 py-2.5 shadow-sm ${theirCorners}
                            ${item.isDeleted ? 'bg-gray-50 border border-gray-200' : 'bg-white border border-gray-200'}
                          `}>
                            <p className={`text-sm leading-relaxed break-words ${item.isDeleted ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                              {item.text}
                            </p>
                          </div>
                          {!isNextSame && (
                            <p className="text-[10px] text-gray-400 mt-1 pl-1 select-none">
                              {formatTime(item.timestamp)}
                            </p>
                          )}
                        </div>
                        {dotBtn}
                      </div>
                    )
                  })}
                </div>

                <div ref={bottomRef} className="h-2" />
              </div>
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
              <div className="flex items-end gap-2 max-w-3xl mx-auto">
                <div className="flex-1 bg-gray-100 rounded-full px-5 py-3 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:bg-white transition-all duration-150">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${otherName}…`}
                    rows={1}
                    className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-24 leading-relaxed"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={`
                    flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                    transition-all duration-150 shadow-sm
                    ${canSend
                      ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:scale-105 active:scale-95'
                      : 'bg-gray-200 cursor-not-allowed'}
                  `}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${canSend ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-2 select-none">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </main>
    </div>
    </>
  )
}
