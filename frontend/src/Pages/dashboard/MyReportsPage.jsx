import { useState, useEffect, useRef } from 'react'
import { getMyReportsAPI, getMyReportByIdAPI, submitAdditionalEvidenceAPI } from '../../api/report.api'
import { NO_IMAGE_PLACEHOLDER as defaultImage } from '../../constants/placeholderImage'
import defaultAvatar from '../../assets/images/default-avatar.jpg'

const STATUS_META = {
  submitted:             { label: 'Submitted',              bg: 'bg-slate-100 text-slate-600' },
  in_review:             { label: 'Under Review',            bg: 'bg-indigo-50 text-indigo-700' },
  waiting_for_evidence:  { label: 'Waiting for More Evidence', bg: 'bg-amber-50 text-amber-700' },
  resolved:              { label: 'Resolved',                bg: 'bg-emerald-50 text-emerald-700' },
  dismissed:             { label: 'Dismissed',                bg: 'bg-gray-100 text-gray-500' },
}

const PRIORITY_META = {
  low:      'bg-sky-50 text-sky-700',
  medium:   'bg-amber-50 text-amber-700',
  high:     'bg-orange-50 text-orange-700',
  critical: 'bg-rose-50 text-rose-700',
}

const TIMELINE_LABELS = {
  submitted: 'Submitted',
  viewed: 'Viewed by moderation team',
  under_review: 'Under Review',
  evidence_requested: 'More evidence requested',
  additional_evidence_submitted: 'Additional evidence submitted',
  action_taken: 'Action Taken',
  closed: 'Closed',
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
const reasonLabel = (r) => REASON_LABELS[r] || r?.replace(/_/g, ' ') || '—'

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, bg: 'bg-gray-100 text-gray-500' }
  return <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${meta.bg}`}>{meta.label}</span>
}

function PriorityBadge({ priority }) {
  return <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${PRIORITY_META[priority] || 'bg-gray-100 text-gray-500'}`}>{priority}</span>
}

function TargetCell({ report }) {
  if (report.reportType === 'listing') {
    return (
      <div className="flex items-center gap-2.5 min-w-0">
        <img src={report.listing?.images?.[0] || defaultImage} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
        <p className="text-sm font-semibold text-gray-800 truncate">{report.listing?.title || 'Listing removed'}</p>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <img src={report.reportedUser?.profileImage || defaultAvatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-200" />
      <p className="text-sm font-semibold text-gray-800 truncate">{report.reportedUser?.name || 'User'}</p>
    </div>
  )
}

function EvidenceThumb({ item }) {
  const isImage = item.mimeType?.startsWith('image/')
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
      {isImage ? (
        <img src={item.url} alt={item.fileName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1">
          <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[8px] text-gray-400 truncate w-full text-center">{item.fileName}</span>
        </div>
      )}
    </a>
  )
}

function AdditionalEvidenceForm({ reportId, onUploaded }) {
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const addFiles = (incoming) => {
    const combined = [...files, ...Array.from(incoming)].slice(0, 5)
    setFiles(combined)
  }

  const submit = async () => {
    if (files.length === 0) { setError('Select at least one file'); return }
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('attachments', f))
      const data = await submitAdditionalEvidenceAPI(reportId, formData)
      onUploaded(data.report)
      setFiles([])
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-amber-800">Our moderation team requested more evidence.</p>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-amber-300 rounded-xl py-5 text-center cursor-pointer hover:border-amber-400 transition-colors"
      >
        <p className="text-xs font-semibold text-amber-700">Click to add screenshots or documents</p>
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
      </div>
      {files.length > 0 && (
        <ul className="text-xs text-amber-800 space-y-1">
          {files.map((f, i) => <li key={i}>• {f.name}</li>)}
        </ul>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || files.length === 0}
        className="text-xs font-bold px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50"
      >
        {busy ? 'Uploading…' : 'Submit Additional Evidence'}
      </button>
    </div>
  )
}

function ReportDetailDrawer({ reportId, onClose }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getMyReportByIdAPI(reportId)
      .then((d) => { if (!cancelled) setReport(d.report) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reportId])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-900">Report Detail</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading || !report ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono font-bold text-gray-700">{report.referenceNumber}</p>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={report.priority} />
                  <StatusBadge status={report.status} />
                </div>
              </div>

              <TargetCell report={report} />

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reason</p>
                <p className="text-sm font-semibold text-gray-800">{reasonLabel(report.reason)}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Your description</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{report.description}</p>
              </div>

              {report.attachments?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Evidence submitted</p>
                  <div className="flex flex-wrap gap-2">
                    {report.attachments.map((a, i) => <EvidenceThumb key={i} item={a} />)}
                  </div>
                </div>
              )}

              {report.additionalEvidence?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Additional evidence</p>
                  <div className="flex flex-wrap gap-2">
                    {report.additionalEvidence.map((a, i) => <EvidenceThumb key={i} item={a} />)}
                  </div>
                </div>
              )}

              {report.status === 'waiting_for_evidence' && (
                <AdditionalEvidenceForm reportId={report._id} onUploaded={setReport} />
              )}

              {report.resolution && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Resolution</p>
                  <p className="text-sm text-gray-700">{report.resolution}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Timeline</p>
                <div className="space-y-3">
                  {[...report.timeline].reverse().map((event, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{TIMELINE_LABELS[event.action] || event.action}</p>
                        <p className="text-[10px] text-gray-400">{formatDateTime(event.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function MyReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let cancelled = false
    getMyReportsAPI()
      .then((d) => { if (!cancelled) setReports(d.reports || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Reports</h1>
        <p className="text-sm text-gray-400 mt-1">
          {loading ? 'Loading…' : `${reports.length} report${reports.length !== 1 ? 's' : ''} filed`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <div className="text-4xl mb-3">🛡️</div>
          <p className="text-base font-semibold text-gray-700 mb-1">No reports filed</p>
          <p className="text-sm text-gray-400">Reports you file on listings or users will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Reference', 'Type', 'Reported', 'Submitted', 'Priority', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider first:pl-5 last:pr-5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map((r) => (
                  <tr key={r._id} onClick={() => setSelectedId(r._id)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 pl-5 py-3 text-xs font-mono font-semibold text-gray-600 whitespace-nowrap">{r.referenceNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize whitespace-nowrap">{r.reportType}</td>
                    <td className="px-4 py-3"><TargetCell report={r} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 pr-5 py-3 text-right">
                      <span className="text-xs font-semibold text-indigo-600">View →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedId && <ReportDetailDrawer reportId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
