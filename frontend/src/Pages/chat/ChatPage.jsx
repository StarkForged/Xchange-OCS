import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import { getListingById } from '../../features/listings/listings.service'
import { getOrCreateChat, getMessages } from '../../features/chat/chat.service'
import { updateListingStatusAPI, confirmTransactionAPI, cancelTransactionAPI } from '../../api/listings.api'
import { createReviewAPI } from '../../api/review.api'
import { getSocket } from '../../socket'
import defaultAvatar from '../../assets/images/default-avatar.jpg'
import defaultImage from '../../assets/images/products/iphone13.jpg'

const formatPrice = (price) =>
  '₹' + (price?.amount?.toLocaleString('en-IN') ?? '0')

const formatTime = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const formatDateLabel = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const groupMessages = (msgs) => {
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

// ── Message action menu ───────────────────────────────────────────────────────

function MessageMenu({ item, mine, onCopy, onDelete }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px] ${mine ? 'right-0' : 'left-0'} bottom-full mb-1`}
    >
      {!item.isDeleted && (
        <button onClick={onCopy} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Message
        </button>
      )}
      {mine && !item.isDeleted && (
        <button onClick={onDelete} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Message
        </button>
      )}
    </div>
  )
}

// ── Mark Sold Confirmation Modal ──────────────────────────────────────────────

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

        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900">Confirm Sale</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Buyer row */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <img
              src={buyer?.profileImage || defaultAvatar}
              alt={buyer?.name}
              className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buyer</p>
              <p className="text-sm font-bold text-gray-900 truncate">{buyer?.name || 'Unknown'}</p>
            </div>
          </div>

          {/* Listing row */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <img
              src={listing?.images?.[0] || defaultImage}
              alt={listing?.title}
              className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Listing</p>
              <p className="text-sm font-bold text-gray-900 truncate">{listing?.title}</p>
            </div>
            <span className="text-sm font-black text-indigo-600 flex-shrink-0">{formatPrice(listing?.price)}</span>
          </div>

          {/* Info list */}
          <ul className="space-y-1.5">
            {[
              'Listing removed from marketplace search',
              'New buyer chats are blocked',
              'Existing chat participants may continue',
              'Reviews locked until both parties confirm',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="mt-0.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
            If the exchange hasn't happened yet, consider <strong>pausing</strong> the listing instead.
          </p>
        </div>

        {/* Actions */}
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
              <button key={r} onClick={() => setSelected(r)} className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${selected === r ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                {r}
              </button>
            ))}
          </div>
          {selected === 'Other' && (
            <textarea value={other} onChange={(e) => setOther(e.target.value)} placeholder="Describe the reason…" rows={2} className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-rose-200" />
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Keep Transaction
          </button>
          <button onClick={() => finalReason && onConfirm(finalReason)} disabled={!finalReason || busy} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors disabled:opacity-40">
            {busy ? 'Cancelling…' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Transaction / listing status panel ───────────────────────────────────────
// Sits below the chat header. Adapts to listing status + user role.

function TransactionPanel({
  listing, listingStatus, transaction, buyerParticipant,
  currentUserId, txBuyerInChat,
  onMarkSold, onPause, onResume, onConfirmTransaction,
  onCancelTransaction, actionBusy,
}) {
  const [reviewDone,  setReviewDone]  = useState(false)
  const [reviewBusy,  setReviewBusy]  = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [rating,      setRating]      = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment,     setComment]     = useState('')
  const [txConfirmed, setTxConfirmed] = useState(false)
  const [showCancel,  setShowCancel]  = useState(false)

  // ── Role derived entirely from stored IDs — never from participant ordering ──
  const meStr    = currentUserId ? String(currentUserId) : ''
  const sellerStr = listing?.seller
    ? String(listing.seller._id ?? listing.seller)
    : ''
  const buyerStr  = transaction?.buyer ? String(transaction.buyer) : ''

  const isSeller        = meStr !== '' && meStr === sellerStr
  const isSelectedBuyer = buyerStr !== '' && meStr === buyerStr
  // Seller is a transaction participant only in the chat that belongs to the selected buyer.
  // txBuyerInChat (passed from ChatPage) is false when viewing an unrelated buyer's chat.
  const isParticipant   = (isSeller && txBuyerInChat) || isSelectedBuyer

  const myTxConfirmed = isSeller
    ? transaction?.sellerConfirmed
    : transaction?.buyerConfirmed

  const dealCompleted = !!(transaction?.completedAt)
  const canReview     = dealCompleted && isParticipant && !reviewDone
  const revieweeId    = isSeller ? buyerStr : sellerStr

  const handleSubmitReview = async () => {
    if (!rating) { setReviewError('Please select a rating'); return }
    setReviewBusy(true)
    setReviewError('')
    try {
      await createReviewAPI({ listingId: listing._id, rating, comment })
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
        <div className="max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
          <div className="flex-1" />
          <Link
            to={`/listings/${listing?._id}`}
            className="text-xs font-semibold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            View Listing
          </Link>
          <button
            onClick={onPause}
            disabled={actionBusy}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            Pause
          </button>
          <button
            onClick={onMarkSold}
            disabled={actionBusy}
            className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            Mark Sold
          </button>
        </div>
      </div>
    )
  }

  // ── PAUSED ────────────────────────────────────────────────────────────────
  if (listingStatus === 'paused') {

    // Paused because a transaction was cancelled — show who cancelled and why
    if (transaction?.cancelled) {
      const cancelledByStr = transaction.cancelledBy ? String(transaction.cancelledBy) : null
      // Role label derived purely from stored IDs — no participant lookup needed
      const cancelledByLabel =
        cancelledByStr === meStr     ? 'You' :
        cancelledByStr === buyerStr  ? 'the buyer' :
        cancelledByStr === sellerStr ? 'the seller' :
        'a participant'

      return (
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto space-y-1.5">
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
        </div>
      )
    }

    return (
      <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Paused
            </span>
            {isSeller && (
              <span className="text-xs text-amber-700 font-medium">Reserved · not publicly visible</span>
            )}
          </div>
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

    // Non-participant (unrelated buyer or seller in a different chat): neutral banner only.
    // isParticipant = (isSeller && txBuyerInChat) || isSelectedBuyer ensures this chat
    // belongs to the actual transaction before showing any transaction controls.
    if (!isParticipant) {
      return (
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500 font-medium">This listing has been sold to another buyer.</span>
          </div>
        </div>
      )
    }

    // Deal complete → review form (participants only)
    if (dealCompleted) {
      return (
        <div className="flex-shrink-0 bg-emerald-50 border-b border-emerald-200 px-4 py-3">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                Sold
              </span>
              <p className="text-xs text-emerald-700 font-semibold">Deal Closed Successfully</p>
            </div>

            {canReview && (
              <div className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-700">Leave a Review</p>
                {/* Star picker */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <svg
                        className={`w-6 h-6 transition-colors ${star <= (hoverRating || rating) ? 'text-amber-400' : 'text-gray-200'}`}
                        fill="currentColor" viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-1.5 text-xs font-semibold text-amber-700">
                      {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                    </span>
                  )}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience (optional)…"
                  rows={2}
                  className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-emerald-300 placeholder-gray-400"
                />
                {reviewError && <p className="text-xs text-red-600 font-medium">{reviewError}</p>}
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewBusy || !rating}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-40"
                >
                  {reviewBusy ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            )}

            {reviewDone && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Review submitted. Thank you!
              </div>
            )}
          </div>
        </div>
      )
    }

    // Sold but not yet completed — show confirmation + cancel
    return (
      <>
        {showCancel && (
          <CancellationReasonModal
            role={isSeller ? 'seller' : 'buyer'}
            onConfirm={async (reason) => { await onCancelTransaction(reason); setShowCancel(false) }}
            onClose={() => setShowCancel(false)}
            busy={actionBusy}
          />
        )}
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-3xl mx-auto space-y-2.5">
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
              myTxConfirmed || txConfirmed ? (
                <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Your confirmation is recorded — waiting for the other party.
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
                    onClick={() => setShowCancel(true)}
                    disabled={actionBusy}
                    className="flex-1 text-xs font-semibold text-gray-600 hover:text-red-700 hover:bg-red-50 border border-gray-200 hover:border-red-300 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel Transaction
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </>
    )
  }

  return null
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [chatId, setChatId]                   = useState(null)
  const [chatParticipants, setChatParticipants] = useState([])
  const [listing, setListing]                 = useState(null)
  const [messages, setMessages]               = useState([])
  const [loading, setLoading]                 = useState(true)
  const [inputText, setInputText]             = useState('')
  const [sellerOnline, setSellerOnline]       = useState(false)
  const [sellerTyping, setSellerTyping]       = useState(false)

  // Transaction state (mirrors listing fields, updated optimistically)
  const [listingStatus,    setListingStatus]    = useState('active')
  const [transaction,      setTransaction]      = useState(null)
  const [showSoldModal,    setShowSoldModal]    = useState(false)
  const [actionBusy,       setActionBusy]       = useState(false)
  const [showCancelModal,  setShowCancelModal]  = useState(false)

  // Message action menu
  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const [menuMsgId, setMenuMsgId]       = useState(null)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const typingTimer = useRef(null)
  const chatIdRef   = useRef(null)

  /* ── Load chat + listing + messages ── */
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const chat = await getOrCreateChat(listingId)
        if (cancelled) return
        const cid = String(chat._id)
        setChatId(cid)
        chatIdRef.current = cid
        setChatParticipants(
          (chat.participants || []).map((p) => ({ _id: String(p._id), name: p.name || 'User' }))
        )

        const [listingData, msgs] = await Promise.all([
          getListingById(listingId),
          getMessages(cid),
        ])
        if (!cancelled) {
          setListing(listingData)
          setListingStatus(listingData?.status || 'active')
          setTransaction(listingData?.transaction || null)
          setMessages((prev) => {
            const dbIds = new Set(msgs.map((m) => m.id))
            const extras = prev.filter((m) => m.id && !dbIds.has(m.id))
            return dedup([...msgs, ...extras])
          })
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [listingId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [loading])

  useEffect(() => {
    if (messages.length > 0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  /* ── Socket ── */
  useEffect(() => {
    if (loading) return
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    socket.emit('register', { userId: user?._id })
    socket.emit('join_chat', { listingId })

    const other = chatParticipants.find((p) => p._id !== String(user?._id))
    const otherIdVal = other?._id

    const onReceive = (msg) => {
      if (!msg?.id || !msg?.text?.trim()) return
      if (msg.listingId && msg.listingId !== listingId) return
      setMessages((prev) => dedup([...prev, msg]))
    }
    const onSent = ({ tempId, realId, timestamp }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, id: realId, timestamp } : m)
      )
    }
    const onDeleted    = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, text: 'This message was deleted', isDeleted: true } : m)
      )
    }
    const onOnline     = (userId) => { if (userId === otherIdVal) setSellerOnline(true) }
    const onOffline    = (userId) => { if (userId === otherIdVal) setSellerOnline(false) }
    const onTyping     = (userId) => { if (userId === otherIdVal) setSellerTyping(true) }
    const onStopTyping = (userId) => { if (userId === otherIdVal) setSellerTyping(false) }

    socket.on('receive_message',  onReceive)
    socket.on('message_sent',     onSent)
    socket.on('message_deleted',  onDeleted)
    socket.on('user_online',      onOnline)
    socket.on('user_offline',     onOffline)
    socket.on('user_typing',      onTyping)
    socket.on('user_stop_typing', onStopTyping)

    return () => {
      socket.emit('leave_chat', { listingId })
      socket.off('receive_message',  onReceive)
      socket.off('message_sent',     onSent)
      socket.off('message_deleted',  onDeleted)
      socket.off('user_online',      onOnline)
      socket.off('user_offline',     onOffline)
      socket.off('user_typing',      onTyping)
      socket.off('user_stop_typing', onStopTyping)
    }
  }, [listingId, loading, chatParticipants, user?._id])

  useEffect(() => { return () => { getSocket().disconnect() } }, [])

  /* ── Transaction actions ── */

  const handlePause = useCallback(async () => {
    setActionBusy(true)
    setShowSoldModal(false)
    try {
      const result = await updateListingStatusAPI(listingId, 'paused')
      setListingStatus('paused')
      setTransaction(result.listing?.transaction || null)
    } catch {}
    finally { setActionBusy(false) }
  }, [listingId])

  const handleResume = useCallback(async () => {
    setActionBusy(true)
    try {
      await updateListingStatusAPI(listingId, 'active')
      setListingStatus('active')
    } catch {}
    finally { setActionBusy(false) }
  }, [listingId])

  // Seller clicks "Mark Sold" → opens modal (buyer already known from chat)
  const handleMarkSoldClick = useCallback(() => {
    setShowSoldModal(true)
  }, [])

  // Modal "Confirm Sold" → call API with buyer from this chat
  const handleConfirmSold = useCallback(async () => {
    setActionBusy(true)
    try {
      const buyer = chatParticipants.find((p) => p._id !== String(user?._id))
      const result = await updateListingStatusAPI(listingId, 'sold', buyer?._id)
      setListingStatus('sold')
      setTransaction(result.listing?.transaction || null)
    } catch {}
    finally {
      setActionBusy(false)
      setShowSoldModal(false)
    }
  }, [listingId, chatParticipants, user])

  // Modal "Pause Instead"
  const handlePauseFromModal = useCallback(async () => {
    setShowSoldModal(false)
    await handlePause()
  }, [handlePause])

  const handleConfirmTransaction = useCallback(async () => {
    setActionBusy(true)
    try {
      const result = await confirmTransactionAPI(listingId)
      const tx = result.listing?.transaction || null
      setTransaction(result.dealCompleted
        ? { ...tx, completedAt: new Date().toISOString() }
        : tx
      )
    } finally {
      setActionBusy(false)
    }
  }, [listingId])

  const handleCancelTransaction = useCallback(async (reason) => {
    setActionBusy(true)
    try {
      const result = await cancelTransactionAPI(listingId, reason)
      setTransaction(result.listing?.transaction || null)
      // Listing moves to paused — seller must explicitly resume
      setListingStatus('paused')
      setShowCancelModal(false)
    } catch {}
    finally { setActionBusy(false) }
  }, [listingId])

  /* ── Messaging ── */
  const handleSend = useCallback(() => {
    const text = inputText.trim()
    if (!text || !user || !listing || !chatIdRef.current) return
    const newMsg = {
      id:        `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      senderId:  String(user._id),
      text,
      timestamp: new Date().toISOString(),
      isDeleted: false,
    }
    setMessages((prev) => dedup([...prev, newMsg]))
    setInputText('')
    inputRef.current?.focus()
    clearTimeout(typingTimer.current)
    getSocket().emit('stop_typing', { listingId, userId: user._id })
    getSocket().emit('send_message', { listingId, chatId: chatIdRef.current, message: newMsg })
  }, [inputText, user, listing, listingId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInputChange = (e) => {
    setInputText(e.target.value)
    if (!user || !listing) return
    const socket = getSocket()
    socket.emit('typing', { listingId, userId: user._id })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socket.emit('stop_typing', { listingId, userId: user._id })
    }, 1500)
  }

  const handleDeleteMessage = useCallback((msg) => {
    setMenuMsgId(null)
    if (!chatIdRef.current) return
    setMessages((prev) =>
      prev.map((m) => m.id === msg.id ? { ...m, text: 'This message was deleted', isDeleted: true } : m)
    )
    getSocket().emit('delete_message', {
      messageId: msg.id,
      chatId:    chatIdRef.current,
      listingId,
      userId:    String(user?._id),
    })
  }, [listingId, user])

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setMenuMsgId(null)
  }

  /* ── Derived ── */
  const isMine = (msg) => String(msg.senderId) === String(user?._id)

  const otherParticipant = chatParticipants.find((p) => p._id !== String(user?._id))
  const otherName        = otherParticipant?.name || 'User'

  // isSeller: check against listing.seller (may be object or id string)
  const sellerIdStr = listing?.seller
    ? String(listing.seller._id || listing.seller)
    : ''
  const isSeller = !!user && sellerIdStr === String(user._id)

  const listingImg = listing?.images?.[0] ?? defaultImage
  const grouped    = groupMessages(messages)
  const canSend    = inputText.trim().length > 0

  /* ── Buyer participant for MarkSoldModal + panels ── */
  // Resolve buyer from transaction.buyer ID, not "other participant".
  // otherParticipant is the SELLER when the buyer views — using it directly
  // would show the wrong name. Match by transaction.buyer ID instead.
  const txBuyerStr       = transaction?.buyer ? String(transaction.buyer) : null
  const participantMatch = txBuyerStr
    ? chatParticipants.find((p) => p._id === txBuyerStr)
    : null
  const buyerParticipant = participantMatch ?? otherParticipant

  // True when the transaction buyer is a participant in THIS chat (or no buyer is set yet).
  // Used to gate review + confirmation UI: the seller should only see these in Buyer A's chat,
  // not in Buyer B's or Buyer C's chat.
  const txBuyerInChat = txBuyerStr === null || participantMatch !== null

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 items-center justify-center gap-3 text-gray-400">
        <svg className="animate-spin h-7 w-7 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-sm font-medium">Loading chat…</span>
      </div>
    )
  }

  return (
    <>
      {/* Mark Sold confirmation modal */}
      {showSoldModal && (
        <MarkSoldModal
          listing={listing}
          buyer={buyerParticipant}
          listingStatus={listingStatus}
          onConfirm={handleConfirmSold}
          onPause={handlePauseFromModal}
          onCancel={() => setShowSoldModal(false)}
          busy={actionBusy}
        />
      )}
      {/* Cancellation reason modal */}
      {showCancelModal && (
        <CancellationReasonModal
          role={isSeller ? 'seller' : 'buyer'}
          onConfirm={handleCancelTransaction}
          onClose={() => setShowCancelModal(false)}
          busy={actionBusy}
        />
      )}

      <div
        className="flex flex-col h-[calc(100vh-4rem)] bg-white"
        onClick={() => setMenuMsgId(null)}
      >

        {/* ── Chat header ── */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Other participant avatar + presence */}
            <div className="relative flex-shrink-0">
              <img src={defaultAvatar} alt={otherName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white transition-colors duration-300 ${sellerOnline ? 'bg-emerald-400' : 'bg-gray-300'}`} />
            </div>

            {/* Name + presence */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-sm leading-tight truncate">{otherName}</p>
                {otherParticipant?._id && (
                  <Link
                    to={`/users/${otherParticipant._id}`}
                    className="flex-shrink-0 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full transition-colors"
                  >
                    Profile
                  </Link>
                )}
              </div>
              {sellerTyping ? (
                <p className="text-xs text-indigo-500 font-medium flex items-center gap-1">
                  <span className="flex gap-0.5">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                  Typing…
                </p>
              ) : (
                <p className={`text-xs font-medium transition-colors duration-300 ${sellerOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {sellerOnline ? 'Online' : 'Offline'}
                </p>
              )}
            </div>

            {/* Listing thumbnail + title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden sm:block text-right">
                <p className="text-xs text-gray-500 truncate max-w-[140px] leading-tight font-semibold">{listing?.title}</p>
                <p className="text-sm font-black text-indigo-600 leading-tight">{formatPrice(listing?.price)}</p>
              </div>
              <Link to={`/listings/${listingId}`}>
                <img src={listingImg} alt={listing?.title} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm hover:opacity-80 transition-opacity" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Transaction / status panel ── */}
        <TransactionPanel
          listing={listing}
          listingStatus={listingStatus}
          transaction={transaction}
          buyerParticipant={buyerParticipant}
          currentUserId={user?._id}
          txBuyerInChat={txBuyerInChat}
          onMarkSold={handleMarkSoldClick}
          onPause={handlePause}
          onResume={handleResume}
          onConfirmTransaction={handleConfirmTransaction}
          onCancelTransaction={handleCancelTransaction}
          actionBusy={actionBusy}
        />

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/60">
          <div className="px-4 py-6 max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-600 text-sm mb-1">Start the conversation</p>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                    Ask {otherName} about <span className="font-medium text-gray-600">{listing?.title}</span>
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
                      <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex-shrink-0 select-none">{item.label}</span>
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
                      className={`w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-400 transition-opacity duration-150 ${showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
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
                    <div className="max-w-[70%] sm:max-w-[55%]">
                      <div className={`px-4 py-2.5 shadow-sm ${mineCorners} ${item.isDeleted ? 'bg-gray-100 border border-gray-200' : 'bg-indigo-600'}`}>
                        <p className={`text-sm leading-relaxed break-words ${item.isDeleted ? 'text-gray-400 italic' : 'text-white'}`}>{item.text}</p>
                      </div>
                      {!isNextSame && (
                        <p className="text-[10px] text-gray-400 mt-1 text-right pr-1 select-none">{formatTime(item.timestamp)}</p>
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
                    <div className="max-w-[70%] sm:max-w-[55%]">
                      <div className={`px-4 py-2.5 shadow-sm ${theirCorners} ${item.isDeleted ? 'bg-gray-50 border border-gray-200' : 'bg-white border border-gray-200'}`}>
                        <p className={`text-sm leading-relaxed break-words ${item.isDeleted ? 'text-gray-400 italic' : 'text-gray-800'}`}>{item.text}</p>
                      </div>
                      {!isNextSame && (
                        <p className="text-[10px] text-gray-400 mt-1 pl-1 select-none">{formatTime(item.timestamp)}</p>
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

        {/* ── Input ── */}
        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <div className="flex-1 bg-gray-100 rounded-full px-5 py-3 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:bg-white transition-all duration-150">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${otherName}…`}
                rows={1}
                className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-24 leading-relaxed"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 shadow-sm ${canSend ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:scale-105 active:scale-95' : 'bg-gray-200 cursor-not-allowed'}`}
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

      </div>
    </>
  )
}
