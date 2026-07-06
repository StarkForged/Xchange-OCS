import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAdminReportByIdAPI,
  markReportUnderReviewAPI,
  requestMoreEvidenceAPI,
  resolveReportAPI,
  dismissAdminReportAPI,
  addReportNoteAPI,
} from '../../../api/admin.api'
import { RequestEvidenceModal, ResolveReportModal, DismissReportModal } from './ReportActionModals'

const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const STATUS_STYLES = {
  submitted:            'bg-slate-700 text-slate-300 border-slate-600',
  in_review:            'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  waiting_for_evidence: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  resolved:             'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  dismissed:            'bg-slate-700 text-slate-400 border-slate-600',
}
const PRIORITY_STYLES = {
  low: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}
const TIMELINE_META = {
  submitted:                     { label: 'Submitted',                     icon: '＋', color: 'text-slate-300' },
  viewed:                        { label: 'Viewed',                       icon: '◔', color: 'text-sky-400' },
  under_review:                  { label: 'Under Review',                 icon: '◐', color: 'text-indigo-400' },
  evidence_requested:            { label: 'Evidence Requested',           icon: '⚠', color: 'text-amber-400' },
  additional_evidence_submitted: { label: 'Additional Evidence Submitted', icon: '↑', color: 'text-amber-400' },
  action_taken:                  { label: 'Action Taken',                 icon: '✓', color: 'text-emerald-400' },
  closed:                        { label: 'Closed',                       icon: '✕', color: 'text-slate-400' },
}
const STATUS_LABELS = {
  submitted:            'Submitted',
  in_review:            'Under Review',
  waiting_for_evidence: 'Waiting for Evidence',
  resolved:             'Resolved',
  dismissed:            'Dismissed',
}
const REASON_LABELS = {
  scam_fraud: 'Scam / Fraud', fake_product: 'Fake Product', counterfeit: 'Counterfeit',
  misleading_description: 'Misleading Description', wrong_category: 'Wrong Category',
  duplicate_listing: 'Duplicate Listing', spam: 'Spam', prohibited_item: 'Prohibited Item',
  stolen_property: 'Stolen Property', offensive_content: 'Offensive Content',
  fraud: 'Fraud', fake_identity: 'Fake Identity', harassment: 'Harassment',
  threatening_behavior: 'Threatening Behavior', no_show: 'No Show',
  payment_outside_platform: 'Payment Outside Platform', suspicious_activity: 'Suspicious Activity',
  other: 'Other',
}
const statusLabel = (s) => STATUS_LABELS[s] || s?.replace(/_/g, ' ') || 'Unknown'
const reasonLabel  = (r) => REASON_LABELS[r]  || r?.replace(/_/g, ' ')  || '—'

function TimelineRow({ event, isLast }) {
  const meta = TIMELINE_META[event.action] || { label: event.action?.replace(/_/g, ' ') || 'Unknown', icon: '•', color: 'text-slate-400' }
  return (
    <div className="flex gap-3.5">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-xs leading-none ${meta.color}`}>
          {meta.icon}
        </div>
        {!isLast && <div className="w-px flex-1 min-h-[1.25rem] bg-slate-700 mt-1" />}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? 'pb-0.5' : 'pb-5'}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-semibold text-slate-200">{meta.label}</p>
          <p className="text-[10px] text-slate-500 whitespace-nowrap">{formatDateTime(event.at)}</p>
        </div>
        {event.by?.name && <p className="text-[10px] text-slate-500 mt-0.5">by {event.by.name}</p>}
        {event.note && (
          <p className="text-[11px] text-slate-400 mt-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 leading-relaxed">
            {event.note}
          </p>
        )}
      </div>
    </div>
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

function EvidenceItem({ item }) {
  const isImage = item.mimeType?.startsWith('image/')
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex-shrink-0 hover:border-indigo-500 transition-colors">
      {isImage ? (
        <img src={item.url} alt={item.fileName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
          <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[8px] text-slate-500 truncate w-full text-center">{item.fileName}</span>
        </div>
      )}
    </a>
  )
}

export default function ReportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [showRequestEvidence, setShowRequestEvidence] = useState(false)
  const [showResolve, setShowResolve] = useState(false)
  const [showDismiss, setShowDismiss] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const d = await getAdminReportByIdAPI(id)
      setData(d)
    } catch (e) {
      setError(e.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const doMarkUnderReview = async () => {
    setBusy(true)
    try {
      await markReportUnderReviewAPI(id)
      showToast('✓ Marked as under review')
      load()
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const doRequestEvidence = async (note) => {
    setBusy(true)
    try {
      await requestMoreEvidenceAPI(id, note)
      showToast('✓ Requested more evidence')
      load()
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setBusy(false)
      setShowRequestEvidence(false)
    }
  }

  const doResolve = async (resolution, falseReport) => {
    setBusy(true)
    try {
      await resolveReportAPI(id, resolution, falseReport)
      showToast('✓ Report resolved')
      load()
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setBusy(false)
      setShowResolve(false)
    }
  }

  const doDismiss = async (resolution) => {
    setBusy(true)
    try {
      await dismissAdminReportAPI(id, resolution)
      showToast('✓ Report dismissed')
      load()
    } catch (e) {
      showToast(`✗ ${e.message}`)
    } finally {
      setBusy(false)
      setShowDismiss(false)
    }
  }

  const doAddNote = async () => {
    if (!noteText.trim()) return
    setNoteBusy(true)
    try {
      const d = await addReportNoteAPI(id, noteText.trim())
      setData((prev) => ({ ...prev, report: { ...prev.report, adminNotes: d.adminNotes } }))
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

  if (error || !data) {
    return (
      <div className="max-w-5xl">
        <p className="text-sm text-red-400">{error || 'Report not found'}</p>
        <button onClick={() => navigate('/admin/reports')} className="mt-3 text-xs text-indigo-400 hover:underline">← Back to reports</button>
      </div>
    )
  }

  const { report, reporterHistory, priorReportsOnTarget, similarReports } = data
  const isOpen = ['submitted', 'in_review', 'waiting_for_evidence'].includes(report.status)

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => navigate('/admin/reports')} className="text-xs text-slate-500 hover:text-slate-300 mb-2">← Back to reports</button>
          <h1 className="text-xl font-bold text-white tracking-tight font-mono">{report.referenceNumber}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${STATUS_STYLES[report.status] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>{statusLabel(report.status)}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLES[report.priority]}`}>{report.priority} priority</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize bg-slate-700 text-slate-300 border-slate-600">{report.reportType}</span>
          </div>
        </div>

        {isOpen && (
          <div className="flex flex-wrap gap-2">
            {report.status === 'submitted' && (
              <button onClick={doMarkUnderReview} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors disabled:opacity-50">
                Mark Under Review
              </button>
            )}
            <button onClick={() => setShowRequestEvidence(true)} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50">
              Request Evidence
            </button>
            <button onClick={() => setShowResolve(true)} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
              Resolve
            </button>
            <button onClick={() => setShowDismiss(true)} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 transition-colors disabled:opacity-50">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {report.resolution && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-slate-300">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Resolution</span>
          {report.resolution}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          <Section title="Report Details">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Reason</p>
              <p className="text-sm font-bold text-white">{reasonLabel(report.reason)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report.description}</p>
            </div>
          </Section>

          <Section title={`Evidence (${report.attachments?.length ?? 0})`}>
            {report.attachments?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {report.attachments.map((a, i) => <EvidenceItem key={i} item={a} />)}
              </div>
            ) : <p className="text-xs text-slate-500">No evidence attached.</p>}
          </Section>

          {report.additionalEvidence?.length > 0 && (
            <Section title={`Additional Evidence (${report.additionalEvidence.length})`}>
              <div className="flex flex-wrap gap-2">
                {report.additionalEvidence.map((a, i) => <EvidenceItem key={i} item={a} />)}
              </div>
            </Section>
          )}

          <Section title="Moderation Timeline">
            {report.timeline?.length === 0 ? (
              <p className="text-xs text-slate-500">No activity yet.</p>
            ) : (
              <div>
                {[...report.timeline].reverse().map((event, i, arr) => (
                  <TimelineRow key={i} event={event} isLast={i === arr.length - 1} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Admin Notes (Internal Only)">
            <div className="space-y-2">
              <textarea
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Internal note — never shown to reporter or reported user…"
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={doAddNote} disabled={noteBusy || !noteText.trim()} className="text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50">
                {noteBusy ? 'Adding…' : 'Add Note'}
              </button>
            </div>
            {report.adminNotes?.length > 0 ? (
              <div className="space-y-2 pt-2">
                {[...report.adminNotes].reverse().map((n, i) => (
                  <div key={i} className="bg-slate-900 rounded-xl p-3">
                    <p className="text-xs text-slate-200">{n.text}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{n.addedBy?.name || 'Admin'} · {formatDateTime(n.addedAt)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-500">No internal notes yet.</p>}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Reporter (Admin Only)">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-700 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">{report.reporter?.name?.[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{report.reporter?.name}</p>
                <p className="text-xs text-slate-400 truncate">{report.reporter?.email}</p>
              </div>
            </div>
            <p className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
              🔒 Anonymous to the reported party — visible to admins only.
            </p>
            {reporterHistory && (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-900 rounded-lg p-2"><p className="text-base font-black text-white">{reporterHistory.totalReports}</p><p className="text-[9px] text-slate-500 uppercase">Total</p></div>
                <div className="bg-slate-900 rounded-lg p-2"><p className="text-base font-black text-emerald-400">{reporterHistory.validReports}</p><p className="text-[9px] text-slate-500 uppercase">Valid</p></div>
                <div className="bg-slate-900 rounded-lg p-2"><p className="text-base font-black text-rose-400">{reporterHistory.falseReports}</p><p className="text-[9px] text-slate-500 uppercase">False</p></div>
                <div className="bg-slate-900 rounded-lg p-2"><p className="text-base font-black text-amber-400">{reporterHistory.pendingReports}</p><p className="text-[9px] text-slate-500 uppercase">Pending</p></div>
              </div>
            )}
          </Section>

          {report.reportType === 'listing' ? (
            <Section title="Listing">
              <p className="text-sm font-bold text-white truncate">{report.listing?.title || 'Listing removed'}</p>
              {report.listing?._id && (
                <button onClick={() => navigate(`/admin/listings/${report.listing._id}`)} className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">
                  Open in Admin Listings
                </button>
              )}
            </Section>
          ) : (
            <Section title="Reported User">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-700/60 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">{report.reportedUser?.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{report.reportedUser?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{report.reportedUser?.email}</p>
                </div>
              </div>
              <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                Trust {report.reportedUser?.trustScore ?? 0}/100
              </span>
              <button onClick={() => navigate(`/admin/users?search=${encodeURIComponent(report.reportedUser?.email || '')}`)} className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">
                Open in Admin Users
              </button>
            </Section>
          )}

          <Section title="Reported-Party History">
            {report.reportedUser?.reportedStats ? (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-900 rounded-lg p-2"><p className="text-base font-black text-white">{report.reportedUser.reportedStats.reportsReceived}</p><p className="text-[9px] text-slate-500 uppercase">Received</p></div>
                <div className="bg-slate-900 rounded-lg p-2"><p className="text-base font-black text-rose-400">{report.reportedUser.reportedStats.validReports}</p><p className="text-[9px] text-slate-500 uppercase">Valid</p></div>
                <div className="bg-slate-900 rounded-lg p-2"><p className="text-base font-black text-slate-400">{report.reportedUser.reportedStats.dismissedReports}</p><p className="text-[9px] text-slate-500 uppercase">Dismissed</p></div>
                <div className="bg-slate-900 rounded-lg p-2"><p className="text-base font-black text-emerald-400">{report.reportedUser.reportedStats.resolvedReports}</p><p className="text-[9px] text-slate-500 uppercase">Resolved</p></div>
              </div>
            ) : <p className="text-xs text-slate-500">No history available.</p>}
          </Section>

          {priorReportsOnTarget?.length > 0 && (
            <Section title="Previous Reports on This Target">
              <div className="space-y-2">
                {priorReportsOnTarget.map((r) => (
                  <button key={r._id} onClick={() => navigate(`/admin/reports/${r._id}`)} className="w-full text-left bg-slate-900 rounded-lg p-2.5 hover:bg-slate-700 transition-colors">
                    <p className="text-xs font-mono font-semibold text-slate-300">{r.referenceNumber}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{statusLabel(r.status)} · {r.priority}</p>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {similarReports?.length > 0 && (
            <Section title="Similar Reports (Same Reason)">
              <div className="space-y-2">
                {similarReports.map((r) => (
                  <button key={r._id} onClick={() => navigate(`/admin/reports/${r._id}`)} className="w-full text-left bg-slate-900 rounded-lg p-2.5 hover:bg-slate-700 transition-colors">
                    <p className="text-xs font-mono font-semibold text-slate-300">{r.referenceNumber}</p>
                    <p className="text-[10px] text-slate-500">{statusLabel(r.status)}</p>
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {showRequestEvidence && <RequestEvidenceModal onConfirm={doRequestEvidence} onCancel={() => setShowRequestEvidence(false)} busy={busy} />}
      {showResolve && <ResolveReportModal onConfirm={doResolve} onCancel={() => setShowResolve(false)} busy={busy} />}
      {showDismiss && <DismissReportModal onConfirm={doDismiss} onCancel={() => setShowDismiss(false)} busy={busy} />}

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
