// Per-listing moderation status card — shown wherever a seller (or the
// seller themself) can see an individual listing, so the notice travels with
// the listing itself rather than living in a page-wide banner. Admin
// moderation (Under Review / Removed) always takes precedence over whatever
// seller-controlled status (active/paused/sold) the listing also has.
const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function WarningIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

export default function ModerationStatusCard({ listing }) {
  if (listing.status === 'removed') {
    return (
      <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
        <WarningIcon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-rose-800 space-y-1">
          <p className="font-bold tracking-wide">REMOVED BY ADMINISTRATOR</p>
          {listing.removedReason && (
            <p><span className="font-semibold">Reason:</span> {listing.removedReason}</p>
          )}
          <p><span className="font-semibold">Removed on:</span> {formatDate(listing.removedAt)}</p>
        </div>
      </div>
    )
  }

  if (listing.isHidden) {
    return (
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <WarningIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold tracking-wide">UNDER REVIEW</p>
          {listing.hiddenReason && (
            <p><span className="font-semibold">Reason:</span> {listing.hiddenReason}</p>
          )}
          <p><span className="font-semibold">Reviewed on:</span> {formatDate(listing.hiddenAt)}</p>
          <p>This listing is temporarily unavailable while our moderation team reviews it.</p>
        </div>
      </div>
    )
  }

  return null
}
