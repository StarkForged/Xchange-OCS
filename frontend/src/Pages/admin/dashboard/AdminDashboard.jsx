import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  getAnalyticsOverviewAPI, getUserAnalyticsAPI, getListingAnalyticsAPI,
  getTransactionAnalyticsAPI, getReviewAnalyticsAPI, getReportAnalyticsAPI,
  getTrustAnalyticsAPI, getMarketplaceHealthAPI, getActivityFeedAPI,
  getInsightsAPI, exportDataAPI,
} from '../../../api/admin.api'

// ═══════════════════════════════════════════════════════════════════════════
// Admin Analytics & Platform Dashboard (Phase 12E)
//
// Every number on this page comes from the analytics/dashboard services on
// the backend (backend/src/Services/analytics.service.js,
// dashboard.service.js) — real Mongo aggregations, no client-side crunching
// of raw record lists and no hardcoded/fake values.
// ═══════════════════════════════════════════════════════════════════════════

const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const CHART_TOOLTIP = { contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 10, fontSize: 12 }, labelStyle: { color: '#94a3b8' } }
const PIE_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5', '#312e81']

// ── Reusable primitives ──────────────────────────────────────────────────────

function ic(d, extra) {
  return () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      {extra}
    </svg>
  )
}

const Icons = {
  users:     ic('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'),
  listings:  ic('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'),
  deal:      ic('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'),
  review:    ic('M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'),
  report:    ic('M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9'),
  eye:       ic('M15 12a3 3 0 11-6 0 3 3 0 016 0z', <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />),
  ban:       ic('M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'),
  heart:     ic('M12 21C7 16.5 3 12.9 3 8.6 3 5.5 5.4 3 8.4 3c1.7 0 3.3.9 4.2 2.3C13.5 3.9 15.1 3 16.8 3 19.8 3 22 5.5 22 8.6c0 4.3-4 7.9-9 12.4z'),
  verified:  ic('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'),
  bolt:      ic('M13 10V3L4 14h7v7l9-11h-7z'),
  store:     ic('M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'),
  clock:     ic('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'),
  download:  ic('M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3'),
  spark:     ic('M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 10l-5.714 2.143L13 19l-2.286-6.857L5 10l5.714-2.143L13 1z'),
  pulse:     ic('M3 12h4l3 8 4-16 3 8h4'),
}

function TrendPill({ today, positiveIsGood = true }) {
  if (today == null) return null
  if (today === 0) return <span className="text-[10px] font-semibold text-slate-500">No change today</span>
  const good = positiveIsGood ? today > 0 : today < 0
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${good ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
      {today > 0 ? '↑' : '↓'} {Math.abs(today)} today
    </span>
  )
}

function SummaryCard({ label, value, today, icon, accent = 'indigo' }) {
  const accents = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    sky: 'bg-sky-500/10 text-sky-400',
  }
  const Icon = icon
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-3 backdrop-blur-sm hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accents[accent]}`}>
          {Icon && <Icon />}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-black text-white leading-none">{value ?? '—'}</p>
        <TrendPill today={today} />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-slate-700 rounded w-24" />
        <div className="w-8 h-8 bg-slate-700 rounded-lg" />
      </div>
      <div className="h-8 bg-slate-700 rounded w-20" />
    </div>
  )
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 ${className}`}>
      <div className="mb-4">
        <p className="text-sm font-bold text-slate-300">{title}</p>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// Horizontal bar breakdown — used for every categorical distribution
// (trust tiers, ratings, reasons, priorities, categories…) instead of a
// dozen separate pie charts. Reads long labels far better at this density.
function BarBreakdown({ data, colorClass = 'bg-indigo-500', emptyText = 'No data yet' }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <div className="h-32 flex items-center justify-center text-slate-600 text-xs">{emptyText}</div>
  }
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.name} className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium truncate pr-2">{d.name}</span>
            <span className="text-slate-300 font-bold flex-shrink-0">{d.value}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colorClass} transition-all duration-700`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function AreaTrend({ data, dataKey = 'count', color = '#6366f1', name = 'Count', gradientId }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={shortDate} interval={6} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip {...CHART_TOOLTIP} labelFormatter={shortDate} itemStyle={{ color }} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">No data</div>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip {...CHART_TOOLTIP} itemStyle={{ color: '#cbd5e1' }} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Trust growth can swing negative (moderation penalties) — a bar chart with
// signed color reads far more honestly than an area chart pinned to zero.
function SignedBarTrend({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={shortDate} interval={6} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip {...CHART_TOOLTIP} labelFormatter={shortDate} />
        <Bar dataKey="netDelta" name="Net Trust Change" radius={[3, 3, 3, 3]}>
          {data.map((d, i) => <Cell key={i} fill={d.netDelta >= 0 ? '#34d399' : '#f43f5e'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function SectionGrid({ children }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{children}</div>
}
function ChartGrid({ children }) {
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{children}</div>
}

// ── Health widget ─────────────────────────────────────────────────────────────

function HealthWidget({ health }) {
  if (!health) return null
  const color = health.score >= 85 ? 'text-emerald-400' : health.score >= 70 ? 'text-sky-400' : health.score >= 50 ? 'text-amber-400' : 'text-rose-400'
  const ring  = health.score >= 85 ? '#34d399' : health.score >= 70 ? '#38bdf8' : health.score >= 50 ? '#fbbf24' : '#fb7185'

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="46" fill="none" stroke="#334155" strokeWidth="9" />
            <circle
              cx="56" cy="56" r="46" fill="none" stroke={ring} strokeWidth="9"
              strokeDasharray={`${(health.score / 100) * 289} 289`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-black ${color}`}>{health.score}%</span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{health.label}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 w-full">
          <p className="text-sm font-bold text-white mb-1">Marketplace Health</p>
          <p className="text-xs text-slate-400 mb-3">Blended score across transactions, activity, moderation, and trust.</p>
          <div className="space-y-1.5">
            {health.reasons?.map((r) => (
              <div key={r} className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Insights + Activity Feed ──────────────────────────────────────────────────

function InsightsPanel({ insights }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icons.spark className="text-amber-400" />
        <p className="text-sm font-bold text-slate-300">Top Insights</p>
      </div>
      {!insights?.length ? (
        <p className="text-xs text-slate-500">Not enough activity yet to generate insights.</p>
      ) : (
        <ul className="space-y-2.5">
          {insights.map((text, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0 text-[9px] font-bold">{i + 1}</span>
              {text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ACTIVITY_META = {
  moderation:  { icon: '🛡️', color: 'text-amber-400' },
  report:      { icon: '⚠️', color: 'text-rose-400' },
  review:      { icon: '⭐', color: 'text-yellow-400' },
  transaction: { icon: '✅', color: 'text-emerald-400' },
  trust:       { icon: '🔷', color: 'text-indigo-400' },
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function ActivityFeed({ events }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icons.pulse className="text-emerald-400" />
        <p className="text-sm font-bold text-slate-300">Live Activity</p>
      </div>
      {!events?.length ? (
        <p className="text-xs text-slate-500">No recent activity.</p>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {events.map((e, i) => {
            const meta = ACTIVITY_META[e.type] || { icon: '•', color: 'text-slate-400' }
            return (
              <div key={i} className="flex items-start gap-3">
                <span className="text-sm flex-shrink-0">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300 leading-snug">{e.message}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(e.createdAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Quick Actions + Export Center ─────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Verify Sellers',   to: '/admin/users?verified=false',  icon: Icons.verified, accent: 'indigo' },
  { label: 'Open Reports',     to: '/admin/reports?status=submitted', icon: Icons.report, accent: 'rose' },
  { label: 'Manage Listings',  to: '/admin/listings',              icon: Icons.listings, accent: 'sky' },
  { label: 'Manage Users',     to: '/admin/users',                 icon: Icons.users,    accent: 'emerald' },
  { label: 'View Transactions',to: '/admin/listings?status=sold',  icon: Icons.deal,     accent: 'amber' },
  { label: 'View Reviews',     to: '/admin/reviews',                icon: Icons.review,   accent: 'indigo' },
]

function QuickActions() {
  const accents = {
    indigo: 'hover:border-indigo-500/40 hover:bg-indigo-500/5',
    rose: 'hover:border-rose-500/40 hover:bg-rose-500/5',
    sky: 'hover:border-sky-500/40 hover:bg-sky-500/5',
    emerald: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
    amber: 'hover:border-amber-500/40 hover:bg-amber-500/5',
  }
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <p className="text-sm font-bold text-slate-300 mb-4">Quick Actions</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <Link
              key={a.label}
              to={a.to}
              className={`flex flex-col items-center justify-center gap-2 text-center border border-slate-700/60 rounded-xl py-4 px-2 transition-colors ${accents[a.accent]}`}
            >
              <Icon />
              <span className="text-[11px] font-semibold text-slate-300">{a.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

const EXPORT_TYPES = [
  { key: 'users', label: 'Users' }, { key: 'listings', label: 'Listings' },
  { key: 'reports', label: 'Reports' }, { key: 'reviews', label: 'Reviews' },
  { key: 'transactions', label: 'Transactions' },
]

function ExportCenter() {
  const [busy, setBusy] = useState(null)
  const handleExport = async (type) => {
    setBusy(type)
    try { await exportDataAPI(type) } catch { /* silent — network hiccup, user can retry */ }
    finally { setBusy(null) }
  }
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <p className="text-sm font-bold text-slate-300 mb-1">Export Center</p>
      <p className="text-[11px] text-slate-500 mb-4">Download platform data as CSV.</p>
      <div className="flex flex-wrap gap-2">
        {EXPORT_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => handleExport(t.key)}
            disabled={busy === t.key}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors disabled:opacity-50"
          >
            <Icons.download className="w-3.5 h-3.5" />
            {busy === t.key ? 'Exporting…' : t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',     label: 'Overview' },
  { key: 'users',        label: 'Users' },
  { key: 'listings',     label: 'Listings' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'reviews',      label: 'Reviews' },
  { key: 'reports',      label: 'Reports' },
  { key: 'trust',        label: 'Trust' },
]

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [overview, users, listings, transactions, reviews, reports, trust, health, activity, insights] =
        await Promise.all([
          getAnalyticsOverviewAPI(), getUserAnalyticsAPI(), getListingAnalyticsAPI(),
          getTransactionAnalyticsAPI(), getReviewAnalyticsAPI(), getReportAnalyticsAPI(),
          getTrustAnalyticsAPI(), getMarketplaceHealthAPI(), getActivityFeedAPI(20), getInsightsAPI(),
        ])
      setData({ overview, users, listings, transactions, reviews, reports, trust, health, activity: activity.events, insights: insights.insights })
    } catch (e) {
      setError(e.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) {
    return <div className="flex items-center justify-center h-64"><p className="text-sm text-red-400">{error}</p></div>
  }

  const { overview, users, listings, transactions, reviews, reports, trust, health, activity, insights } = data

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Complete marketplace overview — actionable, real-time insights</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 w-fit overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SectionGrid>{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</SectionGrid>
      ) : (
        <>
          {tab === 'overview' && overview && (
            <div className="space-y-6">
              <SectionGrid>
                <SummaryCard label="Total Users" value={overview.totalUsers.value} today={overview.totalUsers.today} icon={Icons.users} accent="indigo" />
                <SummaryCard label="Total Listings" value={overview.totalListings.value} today={overview.totalListings.today} icon={Icons.listings} accent="sky" />
                <SummaryCard label="Successful Transactions" value={overview.successfulTransactions.value} today={overview.successfulTransactions.today} icon={Icons.deal} accent="emerald" />
                <SummaryCard label="Total Reviews" value={overview.totalReviews.value} today={overview.totalReviews.today} icon={Icons.review} accent="indigo" />
                <SummaryCard label="Active Reports" value={overview.activeReports.value} today={overview.activeReports.today} icon={Icons.report} accent="rose" />
                <SummaryCard label="Listings Under Review" value={overview.listingsUnderReview.value} icon={Icons.eye} accent="amber" />
                <SummaryCard label="Suspended Users" value={overview.suspendedUsers.value} icon={Icons.ban} accent="rose" />
                <SummaryCard label="Marketplace Health" value={`${overview.marketplaceHealth.value}%`} icon={Icons.spark} accent="emerald" />
              </SectionGrid>

              <HealthWidget health={health} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InsightsPanel insights={insights} />
                <ActivityFeed events={activity} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QuickActions />
                <ExportCenter />
              </div>
            </div>
          )}

          {tab === 'users' && users && (
            <div className="space-y-6">
              <SectionGrid>
                <SummaryCard label="Total Buyers" value={users.cards.totalBuyers} icon={Icons.users} accent="indigo" />
                <SummaryCard label="Total Sellers" value={users.cards.totalSellers} icon={Icons.store} accent="sky" />
                <SummaryCard label="Verified Sellers" value={users.cards.verifiedSellers} icon={Icons.verified} accent="emerald" />
                <SummaryCard label="New Users Today" value={users.cards.newToday} icon={Icons.spark} accent="indigo" />
                <SummaryCard label="Active Users Today" value={users.cards.activeToday} icon={Icons.bolt} accent="emerald" />
                <SummaryCard label="Suspended Users" value={users.cards.suspended} icon={Icons.ban} accent="amber" />
                <SummaryCard label="Banned Users" value={users.cards.banned} icon={Icons.ban} accent="rose" />
              </SectionGrid>
              <ChartGrid>
                <ChartCard title="User Registrations — Last 30 Days">
                  <AreaTrend data={users.charts.registrations} color="#6366f1" name="Registrations" gradientId="colorReg" />
                </ChartCard>
                <ChartCard title="Buyer vs Seller Ratio">
                  <DonutChart data={users.charts.roleRatio} />
                </ChartCard>
                <ChartCard title="Verification Distribution" subtitle="Among registered sellers">
                  <BarBreakdown data={users.charts.verificationDistribution} colorClass="bg-emerald-500" />
                </ChartCard>
                <ChartCard title="Trust Tier Distribution" subtitle="Public trust badge across all members">
                  <BarBreakdown data={users.charts.trustTierDistribution} colorClass="bg-indigo-500" />
                </ChartCard>
              </ChartGrid>
            </div>
          )}

          {tab === 'listings' && listings && (
            <div className="space-y-6">
              <SectionGrid>
                <SummaryCard label="Active Listings" value={listings.cards.active} icon={Icons.listings} accent="emerald" />
                <SummaryCard label="Sold Listings" value={listings.cards.sold} icon={Icons.deal} accent="indigo" />
                <SummaryCard label="Removed Listings" value={listings.cards.removed} icon={Icons.ban} accent="rose" />
                <SummaryCard label="Under Review" value={listings.cards.underReview} icon={Icons.eye} accent="amber" />
                <SummaryCard label="Featured Listings" value={listings.cards.featured} icon={Icons.spark} accent="sky" />
                <SummaryCard label="Average Price" value={`₹${listings.cards.averagePrice.toLocaleString('en-IN')}`} icon={Icons.deal} accent="indigo" />
              </SectionGrid>
              <ChartGrid>
                <ChartCard title="Listings by Category">
                  <BarBreakdown data={listings.charts.listingsByCategory} colorClass="bg-sky-500" />
                </ChartCard>
                <ChartCard title="Listings Created — Last 30 Days">
                  <AreaTrend data={listings.charts.listingsCreatedOverTime} color="#818cf8" name="Listings" gradientId="colorListings2" />
                </ChartCard>
                <ChartCard title="Listing Status Distribution">
                  <DonutChart data={listings.charts.statusDistribution} />
                </ChartCard>
                <ChartCard title="Top Categories">
                  <BarBreakdown data={listings.charts.topCategories} colorClass="bg-indigo-500" />
                </ChartCard>
                <ChartCard title="Most Viewed Categories" className="lg:col-span-2">
                  <BarBreakdown data={listings.charts.mostViewedCategories} colorClass="bg-amber-500" emptyText="No views recorded yet" />
                </ChartCard>
              </ChartGrid>
            </div>
          )}

          {tab === 'transactions' && transactions && (
            <div className="space-y-6">
              <SectionGrid>
                <SummaryCard label="Successful Deals" value={transactions.cards.successful} icon={Icons.deal} accent="emerald" />
                <SummaryCard label="Cancelled Deals" value={transactions.cards.cancelled} icon={Icons.ban} accent="rose" />
                <SummaryCard label="Completion Rate" value={`${transactions.cards.completionRate}%`} icon={Icons.spark} accent="indigo" />
                <SummaryCard label="Avg. Completion Time" value={`${transactions.cards.avgCompletionDays}d`} icon={Icons.clock} accent="sky" />
              </SectionGrid>
              <ChartGrid>
                <ChartCard title="Transactions — Last 30 Days">
                  <AreaTrend data={transactions.charts.transactionsOverTime} color="#34d399" name="Completed" gradientId="colorTx2" />
                </ChartCard>
                <ChartCard title="Completion vs Cancellation">
                  <DonutChart data={transactions.charts.completionVsCancellation} />
                </ChartCard>
              </ChartGrid>
            </div>
          )}

          {tab === 'reviews' && reviews && (
            <div className="space-y-6">
              <SectionGrid>
                <SummaryCard label="Reviews Submitted" value={reviews.cards.submitted} icon={Icons.review} accent="indigo" />
                <SummaryCard label="Average Rating" value={`${reviews.cards.averageRating}/5`} icon={Icons.spark} accent="amber" />
                <SummaryCard label="Pending Reviews" value={reviews.cards.pending} icon={Icons.clock} accent="sky" />
              </SectionGrid>
              <ChartGrid>
                <ChartCard title="Rating Distribution">
                  <BarBreakdown data={reviews.charts.ratingDistribution} colorClass="bg-amber-500" />
                </ChartCard>
              </ChartGrid>
            </div>
          )}

          {tab === 'reports' && reports && (
            <div className="space-y-6">
              <SectionGrid>
                <SummaryCard label="Total Reports" value={reports.cards.total} icon={Icons.report} accent="indigo" />
                <SummaryCard label="Open Reports" value={reports.cards.open} icon={Icons.eye} accent="amber" />
                <SummaryCard label="Under Review" value={reports.cards.underReview} icon={Icons.clock} accent="sky" />
                <SummaryCard label="Resolved" value={reports.cards.resolved} icon={Icons.deal} accent="emerald" />
                <SummaryCard label="Dismissed" value={reports.cards.dismissed} icon={Icons.ban} accent="rose" />
              </SectionGrid>
              <ChartGrid>
                <ChartCard title="Reports by Reason">
                  <BarBreakdown data={reports.charts.byReason} colorClass="bg-rose-500" />
                </ChartCard>
                <ChartCard title="Reports — Last 30 Days">
                  <AreaTrend data={reports.charts.overTime} color="#fb7185" name="Reports" gradientId="colorReports2" />
                </ChartCard>
                <ChartCard title="Priority Distribution" className="lg:col-span-2">
                  <BarBreakdown data={reports.charts.priorityDistribution} colorClass="bg-orange-500" />
                </ChartCard>
              </ChartGrid>
            </div>
          )}

          {tab === 'trust' && trust && (
            <div className="space-y-6">
              <SectionGrid>
                <SummaryCard label="Average Marketplace Trust" value={`${trust.cards.averageTrust}/100`} icon={Icons.spark} accent="indigo" />
                <SummaryCard label="Verified Members" value={trust.cards.verifiedMembers} icon={Icons.verified} accent="emerald" />
                <SummaryCard label="Critical Moderation Cases" value={trust.cards.criticalModerationCases} icon={Icons.ban} accent="rose" />
                <SummaryCard label="Trust Appeals Pending" value={trust.cards.appealsPending} icon={Icons.clock} accent="amber" />
                <SummaryCard label="Permanent Bans" value={trust.cards.permanentBans} icon={Icons.ban} accent="rose" />
              </SectionGrid>
              <ChartGrid>
                <ChartCard title="Trust Tier Distribution">
                  <BarBreakdown data={trust.charts.trustTierDistribution} colorClass="bg-indigo-500" />
                </ChartCard>
                <ChartCard title="Trust Growth" subtitle="Net trust score change per day, platform-wide">
                  <SignedBarTrend data={trust.charts.trustGrowth} />
                </ChartCard>
                <ChartCard title="Moderation Impact" subtitle="Confirmed moderation actions by severity" className="lg:col-span-2">
                  <BarBreakdown data={trust.charts.moderationImpact} colorClass="bg-rose-500" />
                </ChartCard>
              </ChartGrid>
            </div>
          )}
        </>
      )}
    </div>
  )
}
