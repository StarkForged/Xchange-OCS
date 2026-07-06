import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminReportsAPI } from '../../../api/admin.api'
import ActionMenu from '../../../components/ui/ActionMenu'

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_STYLES = {
  submitted:            'bg-slate-700 text-slate-300 border-slate-600',
  in_review:            'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  waiting_for_evidence: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  resolved:             'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  dismissed:            'bg-slate-700 text-slate-400 border-slate-600',
}

const PRIORITY_STYLES = {
  low:      'bg-sky-500/10 text-sky-400 border-sky-500/20',
  medium:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

const STATUS_LABELS = {
  submitted:            'Submitted',
  in_review:            'Under Review',
  waiting_for_evidence: 'Waiting for Evidence',
  resolved:             'Resolved',
  dismissed:            'Dismissed',
}

function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status?.replace(/_/g, ' ') || 'Unknown'
  return <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize whitespace-nowrap ${STATUS_STYLES[status] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>{label}</span>
}

function PriorityBadge({ priority }) {
  return <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLES[priority] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>{priority}</span>
}

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

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 transition-all duration-200 hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-white'}`}>{value ?? 0}</p>
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
          <div className="h-3 bg-slate-700 rounded w-24" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-slate-700 rounded w-40" />
          </div>
          <div className="h-5 w-16 bg-slate-700 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const navigate = useNavigate()

  const [reports, setReports]     = useState([])
  const [summary, setSummary]     = useState({})
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 })
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]       = useState('')
  const [reportType, setReportType] = useState('')
  const [status, setStatus]       = useState('')
  const [priority, setPriority]   = useState('')
  const [page, setPage]           = useState(1)
  const [openMenuId, setOpenMenuId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 20 }
      if (search)     params.search = search
      if (reportType) params.reportType = reportType
      if (status)     params.status = status
      if (priority)   params.priority = priority

      const data = await getAdminReportsAPI(params)
      setReports(data.reports)
      setSummary(data.summary)
      setPagination(data.pagination)
    } catch (e) {
      setError(e.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [page, search, reportType, status, priority])

  useEffect(() => { load() }, [load])

  const hasFilters = search || reportType || status || priority

  const clearFilters = () => {
    setSearchInput(''); setSearch('')
    setReportType(''); setStatus(''); setPriority('')
    setPage(1)
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
        <p className="text-sm text-slate-400 mt-1">
          {loading ? 'Loading…' : `${pagination.total.toLocaleString()} reports total`}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Submitted"  value={summary.submitted} accent="text-slate-300" />
        <SummaryCard label="Under Review" value={summary.inReview}  accent="text-indigo-400" />
        <SummaryCard label="Awaiting Evidence" value={summary.waitingForEvidence} accent="text-amber-400" />
        <SummaryCard label="Resolved"   value={summary.resolved}  accent="text-emerald-400" />
        <SummaryCard label="Dismissed"  value={summary.dismissed} accent="text-slate-400" />
        <SummaryCard label="Critical Open" value={summary.criticalOpen} accent="text-rose-400" />
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
        <input
          type="text"
          placeholder="Search by reference number or name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={reportType} onChange={(v) => { setReportType(v); setPage(1) }} options={[
            { v: '', l: 'All Types' }, { v: 'listing', l: 'Listing' }, { v: 'user', l: 'User' },
          ]} />
          <Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={[
            { v: '', l: 'All Statuses' },
            { v: 'submitted', l: 'Submitted' },
            { v: 'in_review', l: 'Under Review' },
            { v: 'waiting_for_evidence', l: 'Waiting for Evidence' },
            { v: 'resolved', l: 'Resolved' },
            { v: 'dismissed', l: 'Dismissed' },
          ]} />
          <Select value={priority} onChange={(v) => { setPriority(v); setPage(1) }} options={[
            { v: '', l: 'All Priorities' }, { v: 'low', l: 'Low' }, { v: 'medium', l: 'Medium' }, { v: 'high', l: 'High' }, { v: 'critical', l: 'Critical' },
          ]} />
          {hasFilters && (
            <button onClick={clearFilters} className="px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-xl text-xs transition-colors">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-red-400">{error}</div>
        ) : loading ? (
          <TableSkeleton />
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm">No reports found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Reference', 'Type', 'Reported', 'Reporter', 'Priority', 'Status', 'Filed', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider first:pl-5 last:pr-5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {reports.map((r) => (
                  <tr key={r._id} onClick={() => navigate(`/admin/reports/${r._id}`)} className="hover:bg-slate-700/40 transition-colors cursor-pointer">
                    <td className="px-4 pl-5 py-3 text-xs font-mono font-semibold text-slate-300 whitespace-nowrap">{r.referenceNumber}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 capitalize whitespace-nowrap">{r.reportType}</td>
                    <td className="px-4 py-3 text-xs text-slate-300 max-w-[180px] truncate">
                      {r.reportType === 'listing' ? (r.listing?.title || 'Listing removed') : (r.reportedUser?.name || 'Unknown')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[140px] truncate">{r.reporter?.name || '—'}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-4 pr-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        isOpen={openMenuId === r._id}
                        onToggle={() => setOpenMenuId((v) => (v === r._id ? null : r._id))}
                        onClose={() => setOpenMenuId((v) => (v === r._id ? null : v))}
                        items={[
                          { key: 'open', label: 'Open Report', onClick: () => navigate(`/admin/reports/${r._id}`) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.pages}
              <span className="ml-2 text-slate-600">({pagination.total} total)</span>
            </p>
            <div className="flex gap-1">
              <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</PageBtn>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page >= pagination.pages - 2 ? pagination.pages - 4 + i : page - 2 + i
                if (p < 1 || p > pagination.pages) return null
                return <PageBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PageBtn>
              })}
              <PageBtn onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</PageBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
