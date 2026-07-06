import { useEffect, useState } from 'react'

export const HIDE_REASONS = [
  { value: 'spam',          label: 'Spam' },
  { value: 'duplicate',     label: 'Duplicate Listing' },
  { value: 'fraudulent',    label: 'Fraudulent Listing' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'misleading',    label: 'Misleading Information' },
  { value: 'counterfeit',   label: 'Counterfeit Item' },
  { value: 'other',         label: 'Other' },
]

function ModalShell({ onClose, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full ${maxWidth} p-6 space-y-4`}>
        {children}
      </div>
    </div>
  )
}

// ── Hide Listing ──────────────────────────────────────────────────────────────

export function HideListingModal({ listing, onConfirm, onCancel, busy }) {
  const [reason, setReason] = useState('')
  const [note, setNote]     = useState('')
  const [error, setError]   = useState('')

  const submit = () => {
    if (!reason) { setError('Select a reason'); return }
    if (reason === 'other' && !note.trim()) { setError('A text explanation is required for "Other"'); return }
    onConfirm(reason, note.trim())
  }

  return (
    <ModalShell onClose={onCancel}>
      <div>
        <h3 className="text-sm font-bold text-white">Mark Listing Under Review</h3>
        <p className="text-xs text-slate-400 mt-1 truncate">{listing?.title}</p>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        The listing will disappear from the marketplace. The seller will still see it in
        My Listings under "Under Review" — with the reason below — but cannot resume, pause,
        mark it sold, or otherwise change it while it's under review.
      </p>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-400">Reason</label>
        <div className="grid grid-cols-2 gap-2">
          {HIDE_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => { setReason(r.value); setError('') }}
              className={`text-left px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                reason === r.value
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {reason === 'other' && (
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Explanation</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => { setNote(e.target.value); setError('') }}
            placeholder="Explain why this listing is being put under review…"
            className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          {busy ? 'Marking…' : 'Mark Under Review'}
        </button>
      </div>
    </ModalShell>
  )
}

// ── Remove Listing (permanent) ────────────────────────────────────────────────

// Trust Framework v2 moderation severity — a listing removal is CONFIRMED
// moderation and feeds the seller's Moderation trust pillar, so the admin
// must classify how serious it was. Examples mirror backend/src/Utils/moderationSeverity.js.
const SEVERITY_OPTIONS = [
  { value: 'minor',    label: 'Minor',    hint: 'Wrong category, duplicate, expired listing',   cls: 'border-amber-500/40 text-amber-300' },
  { value: 'medium',   label: 'Medium',   hint: 'Spam, misleading listing, counterfeit',          cls: 'border-orange-500/40 text-orange-300' },
  { value: 'critical', label: 'Critical', hint: 'Fraud, scam, identity theft',                    cls: 'border-rose-500/40 text-rose-300' },
]

export function RemoveListingModal({ listing, onConfirm, onCancel, busy }) {
  const [typed, setTyped]     = useState('')
  const [reason, setReason]   = useState('')
  const [severity, setSeverity] = useState('')
  const [error, setError]     = useState('')
  const canConfirm = typed.trim() === 'DELETE' && !!severity

  const submit = () => {
    if (!severity) { setError('Select a moderation severity'); return }
    onConfirm(reason.trim(), severity)
  }

  return (
    <ModalShell onClose={onCancel}>
      <div>
        <h3 className="text-sm font-bold text-rose-400">Remove Listing</h3>
        <p className="text-xs text-slate-400 mt-1 truncate">{listing?.title}</p>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        This removes the listing from the marketplace and the seller's dashboard immediately.
        It is kept in the database for audit purposes and can be <strong className="text-slate-200">restored</strong> later
        from the "Removed" filter. This is confirmed moderation — it will affect the seller's trust score.
      </p>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-400">Severity</label>
        <div className="grid grid-cols-1 gap-2">
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => { setSeverity(s.value); setError('') }}
              className={`text-left px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                severity === s.value
                  ? `bg-slate-900 ${s.cls}`
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className="block">{s.label}</span>
              <span className="block font-normal text-slate-500 mt-0.5">{s.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Reason (internal)</label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Internal note about why this was removed…"
          className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">
          Type <span className="text-white font-mono">DELETE</span> to confirm
        </label>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 font-mono"
        />
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy || !canConfirm}
          className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Removing…' : 'Remove Listing'}
        </button>
      </div>
    </ModalShell>
  )
}

// ── Feature Listing ───────────────────────────────────────────────────────────

export function FeatureListingModal({ listing, onConfirm, onCancel, busy }) {
  const [reason, setReason] = useState('')

  return (
    <ModalShell onClose={onCancel}>
      <div>
        <h3 className="text-sm font-bold text-white">Feature Listing</h3>
        <p className="text-xs text-slate-400 mt-1 truncate">{listing?.title}</p>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Featured listings get priority placement across the marketplace.
      </p>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Reason (optional, internal)</label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Promotional partner, high quality listing…"
          className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(reason.trim())}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          {busy ? 'Featuring…' : 'Feature Listing'}
        </button>
      </div>
    </ModalShell>
  )
}
