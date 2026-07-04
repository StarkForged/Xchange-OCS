import { useState, useEffect, useCallback } from 'react'
import { getAdminUsersAPI, adminUserActionAPI } from '../../../api/admin.api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const timeAgo = (d) => {
  if (!d) return '—'
  const diff  = Date.now() - new Date(d)
  const days  = Math.floor(diff / 86400000)
  const months = Math.floor(days / 30)
  if (days === 0) return 'Today'
  if (days < 30)  return `${days}d ago`
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const s = {
    buyer:  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    seller: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    admin:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  }[role] || 'bg-slate-700 text-slate-400'
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${s}`}>
      {role}
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = {
    active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    suspended: 'bg-amber-500/10   text-amber-400   border-amber-500/20',
    banned:    'bg-rose-500/10    text-rose-400    border-rose-500/20',
  }[status] || 'bg-slate-700 text-slate-400'
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${s}`}>
      {status}
    </span>
  )
}

// ── Action menu ───────────────────────────────────────────────────────────────

const ACTIONS = {
  buyer:  ['suspend', 'activate', 'ban'],
  seller: ['suspend', 'activate', 'ban', 'verify', 'unverify'],
  admin:  [],
}

const ACTION_LABELS = {
  suspend:  { label: 'Suspend',            color: 'text-amber-400 hover:bg-amber-500/10'  },
  activate: { label: 'Activate',           color: 'text-emerald-400 hover:bg-emerald-500/10' },
  ban:      { label: 'Ban',                color: 'text-rose-400 hover:bg-rose-500/10'    },
  verify:   { label: 'Verify Seller',      color: 'text-indigo-400 hover:bg-indigo-500/10' },
  unverify: { label: 'Remove Verification',color: 'text-slate-400 hover:bg-slate-700'    },
}

function ActionMenu({ user, onAction, busy }) {
  const [open, setOpen] = useState(false)
  const actions = ACTIONS[user.role] || []

  if (actions.length === 0) {
    return <span className="text-[10px] text-slate-600">—</span>
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        disabled={busy}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 min-w-[170px]">
            {actions.map((a) => {
              const cfg = ACTION_LABELS[a]
              return (
                <button
                  key={a}
                  onClick={() => { setOpen(false); onAction(user._id, a) }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${cfg.color}`}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── User detail drawer ────────────────────────────────────────────────────────

function UserDetailDrawer({ user, onClose }) {
  if (!user) return null

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">User Detail</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-700 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-white">{user.name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="text-base font-bold text-white">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
              {user.phone && <p className="text-xs text-slate-500">{user.phone}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.accountStatus || 'active'} />
            {user.isVerifiedSeller && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                ✓ Verified Seller
              </span>
            )}
            {user.ghostRisk?.flagged && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/20">
                ⚠ Ghost Risk
              </span>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Trust Score',    value: `${user.trustScore ?? 0}/100` },
              { label: 'Profile %',      value: `${user.profileCompletion ?? 0}%` },
              { label: 'Completed Deals',value: user.completedDeals ?? 0 },
              { label: 'Joined',         value: timeAgo(user.createdAt) },
            ].map((m) => (
              <div key={m.label} className="bg-slate-800 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{m.label}</p>
                <p className="text-sm font-bold text-slate-200">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Seller metrics */}
          {user.role === 'seller' && user.sellerMetrics && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seller Metrics</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Response Rate',  value: `${user.sellerMetrics.responseRate ?? 0}%` },
                  { label: 'Total Inquiries',value: user.sellerMetrics.totalInquiries ?? 0 },
                ].map((m) => (
                  <div key={m.label} className="bg-slate-800 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-sm font-bold text-slate-200">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ghost risk */}
          {user.ghostRisk && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ghost Risk</p>
              <div className="bg-slate-800 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Score</span>
                  <span className={`font-bold ${user.ghostRisk.score >= 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {user.ghostRisk.score ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${user.ghostRisk.score >= 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${user.ghostRisk.score ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Raw id */}
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">User ID</p>
            <p className="text-[11px] text-slate-500 font-mono break-all">{user._id}</p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Confirmation dialog ───────────────────────────────────────────────────────

function ConfirmDialog({ action, user, onConfirm, onCancel, busy }) {
  const cfg = ACTION_LABELS[action]
  const dangerActions = ['ban', 'suspend']
  const isDanger = dangerActions.includes(action)

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">{cfg.label} — {user?.name}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Are you sure you want to <strong className="text-white">{action}</strong> this user?
            {isDanger && ' This will restrict their access to the platform.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={busy}
              className="flex-1 py-2 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {busy ? 'Working…' : `Confirm ${cfg.label}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users,       setUsers]       = useState([])
  const [pagination,  setPagination]  = useState({ page: 1, pages: 1, total: 0, limit: 20 })
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [search,      setSearch]      = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roleFilter,  setRoleFilter]  = useState('')
  const [statusFilter,setStatusFilter]= useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('')
  const [ghostFilter, setGhostFilter] = useState('')
  const [page,        setPage]        = useState(1)
  const [detailUser,  setDetailUser]  = useState(null)
  const [pendingAction, setPendingAction] = useState(null) // { userId, action, user }
  const [actionBusy,  setActionBusy]  = useState(false)
  const [toast,       setToast]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 20 }
      if (search)        params.search   = search
      if (roleFilter)    params.role     = roleFilter
      if (statusFilter)  params.status   = statusFilter
      if (verifiedFilter) params.verified = verifiedFilter
      if (ghostFilter)   params.ghost    = ghostFilter

      const data = await getAdminUsersAPI(params)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (e) {
      setError(e.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, statusFilter, verifiedFilter, ghostFilter])

  useEffect(() => { load() }, [load])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleAction = (userId, action) => {
    const user = users.find((u) => u._id === userId)
    setPendingAction({ userId, action, user })
  }

  const confirmAction = async () => {
    if (!pendingAction) return
    setActionBusy(true)
    try {
      const data = await adminUserActionAPI(pendingAction.userId, pendingAction.action)
      setUsers((prev) =>
        prev.map((u) => u._id === pendingAction.userId
          ? { ...u, accountStatus: data.user.accountStatus, isVerifiedSeller: data.user.isVerifiedSeller }
          : u
        )
      )
      setToast(`✓ ${data.message}`)
      setTimeout(() => setToast(''), 3500)
    } catch (e) {
      setToast(`✗ ${e.message}`)
      setTimeout(() => setToast(''), 3500)
    } finally {
      setActionBusy(false)
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Users</h1>
          <p className="text-sm text-slate-400 mt-1">
            {loading ? 'Loading…' : `${pagination.total.toLocaleString()} users total`}
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <div className="flex flex-1 min-w-[200px] gap-2">
            <input
              type="text"
              placeholder="Search by name, email, phone…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Search
            </button>
            {(search || searchInput) && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-xl text-sm transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={roleFilter}   onChange={(v) => { setRoleFilter(v);   setPage(1) }} label="Role"   options={[{ v: '', l: 'All Roles' }, { v: 'buyer', l: 'Buyer' }, { v: 'seller', l: 'Seller' }, { v: 'admin', l: 'Admin' }]} />
            <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} label="Status" options={[{ v: '', l: 'All Statuses' }, { v: 'active', l: 'Active' }, { v: 'suspended', l: 'Suspended' }, { v: 'banned', l: 'Banned' }]} />
            <Select value={verifiedFilter} onChange={(v) => { setVerifiedFilter(v); setPage(1) }} label="Verified" options={[{ v: '', l: 'Any' }, { v: 'true', l: 'Verified' }, { v: 'false', l: 'Unverified' }]} />
            <Select value={ghostFilter}  onChange={(v) => { setGhostFilter(v);  setPage(1) }} label="Ghost"  options={[{ v: '', l: 'Any' }, { v: 'true', l: 'Flagged' }]} />
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-sm text-red-400">{error}</div>
        ) : loading ? (
          <TableSkeleton />
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm">No users found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  {['User', 'Role', 'Status', 'Verified', 'Trust', 'Ghost', 'Joined', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((user) => (
                  <tr
                    key={user._id}
                    onClick={() => setDetailUser(user)}
                    className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 pl-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-700/60 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-300">{user.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate max-w-[150px]">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.accountStatus || 'active'} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {user.isVerifiedSeller ? (
                        <span className="text-emerald-400 font-semibold">✓ Yes</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${user.trustScore ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">{user.trustScore ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {user.ghostRisk?.flagged
                        ? <span className="text-rose-400 font-semibold">⚠ Flagged</span>
                        : <span className="text-slate-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(user.createdAt)}</td>
                    <td className="px-4 pr-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu user={user} onAction={handleAction} busy={actionBusy} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700">
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
                return (
                  <PageBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PageBtn>
                )
              })}
              <PageBtn onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</PageBtn>
            </div>
          </div>
        )}
      </div>

      {/* Drawers + dialogs */}
      {detailUser && <UserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} />}

      {pendingAction && (
        <ConfirmDialog
          action={pendingAction.action}
          user={pendingAction.user}
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
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

// ── Mini helpers ──────────────────────────────────────────────────────────────

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition"
    >
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}

function PageBtn({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
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
          <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-slate-700 rounded w-32" />
            <div className="h-2.5 bg-slate-700 rounded w-48" />
          </div>
          <div className="h-5 w-12 bg-slate-700 rounded-full" />
          <div className="h-5 w-14 bg-slate-700 rounded-full" />
          <div className="h-3 w-16 bg-slate-700 rounded ml-auto" />
        </div>
      ))}
    </div>
  )
}
