import { useEffect, useState } from 'react'

function ModalShell({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        {children}
      </div>
    </div>
  )
}

export function RequestEvidenceModal({ onConfirm, onCancel, busy }) {
  const [note, setNote] = useState('')

  return (
    <ModalShell onClose={onCancel}>
      <h3 className="text-sm font-bold text-white">Request More Evidence</h3>
      <p className="text-xs text-slate-400 leading-relaxed">
        The reporter will be able to upload additional screenshots or documents to this same report.
      </p>
      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What additional evidence is needed?"
        className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">
          Cancel
        </button>
        <button onClick={() => onConfirm(note.trim())} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50">
          {busy ? 'Requesting…' : 'Request Evidence'}
        </button>
      </div>
    </ModalShell>
  )
}

export function ResolveReportModal({ onConfirm, onCancel, busy }) {
  const [resolution, setResolution] = useState('')
  const [falseReport, setFalseReport] = useState(false)
  const [error, setError] = useState('')

  const submit = () => {
    if (!resolution.trim()) { setError('A resolution summary is required'); return }
    onConfirm(resolution.trim(), falseReport)
  }

  return (
    <ModalShell onClose={onCancel}>
      <h3 className="text-sm font-bold text-white">Resolve Report</h3>
      <textarea
        rows={3}
        value={resolution}
        onChange={(e) => { setResolution(e.target.value); setError('') }}
        placeholder="Summarize the action taken (e.g. listing hidden, seller warned)…"
        className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={falseReport} onChange={(e) => setFalseReport(e.target.checked)} className="mt-0.5 w-4 h-4 accent-rose-600 flex-shrink-0" />
        <span className="text-xs text-slate-400 leading-relaxed">
          This report was found to be false or unfounded (marks it against the reporter's history).
        </span>
      </label>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">
          Cancel
        </button>
        <button onClick={submit} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50">
          {busy ? 'Resolving…' : 'Resolve Report'}
        </button>
      </div>
    </ModalShell>
  )
}

export function DismissReportModal({ onConfirm, onCancel, busy }) {
  const [resolution, setResolution] = useState('')

  return (
    <ModalShell onClose={onCancel}>
      <h3 className="text-sm font-bold text-white">Dismiss Report</h3>
      <p className="text-xs text-slate-400 leading-relaxed">
        No action will be taken. The reporter and reported party are unaffected beyond this report being closed.
      </p>
      <textarea
        rows={2}
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        placeholder="Reason for dismissal (optional)…"
        className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">
          Cancel
        </button>
        <button onClick={() => onConfirm(resolution.trim())} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold transition-colors disabled:opacity-50">
          {busy ? 'Dismissing…' : 'Dismiss Report'}
        </button>
      </div>
    </ModalShell>
  )
}
