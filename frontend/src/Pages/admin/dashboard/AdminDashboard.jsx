import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getAdminStatsAPI, getAdminChartDataAPI } from '../../../api/admin.api'

// ── Stat card ─────────────────────────────────────────────────────────────────
// shade: 'bright' | 'mid' | 'dim'  — all stay within the indigo family

function StatCard({ label, value, sub, shade = 'mid', icon }) {
  const shades = {
    bright: { bg: 'bg-indigo-500/15', icon: 'text-indigo-300' },
    mid:    { bg: 'bg-indigo-500/10', icon: 'text-indigo-400' },
    dim:    { bg: 'bg-indigo-500/8',  icon: 'text-indigo-500' },
  }
  const s = shades[shade] || shades.mid

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.icon}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-black text-white leading-none">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Chart wrapper ─────────────────────────────────────────────────────────────

function ChartCard({ title, children }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <p className="text-sm font-bold text-slate-300 mb-5">{title}</p>
      {children}
    </div>
  )
}

// ── Short date label ──────────────────────────────────────────────────────────

const shortDate = (d) => {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const PIE_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe']

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-slate-700 rounded w-24" />
        <div className="w-8 h-8 bg-slate-700 rounded-lg" />
      </div>
      <div className="h-8 bg-slate-700 rounded w-20" />
      <div className="h-2.5 bg-slate-700 rounded w-32" />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null)
  const [charts,  setCharts]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [s, c] = await Promise.all([getAdminStatsAPI(), getAdminChartDataAPI()])
        if (!cancelled) { setStats(s); setCharts(c) }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  const statCards = stats ? [
    { label: 'Total Users',        value: stats.users.total,              shade: 'bright', sub: `${stats.users.buyers} buyers · ${stats.users.sellers} sellers`, icon: <UsersIcon /> },
    { label: 'Buyers',             value: stats.users.buyers,             shade: 'mid',   sub: 'Registered buyers',                                               icon: <UserIcon /> },
    { label: 'Sellers',            value: stats.users.sellers,            shade: 'mid',   sub: 'Registered sellers',                                              icon: <StoreIcon /> },
    { label: 'Total Listings',     value: stats.listings.total,           shade: 'bright', sub: `${stats.listings.active} active · ${stats.listings.sold} sold`,   icon: <ListIcon /> },
    { label: 'Active Listings',    value: stats.listings.active,          shade: 'mid',   sub: 'Currently live',                                                  icon: <CheckIcon /> },
    { label: 'Paused Listings',    value: stats.listings.paused,          shade: 'dim',   sub: 'Hidden from search',                                              icon: <PauseIcon /> },
    { label: 'Sold Listings',      value: stats.listings.sold,            shade: 'dim',   sub: 'Marked as sold',                                                  icon: <TagIcon /> },
    { label: 'Completed Deals',    value: stats.transactions.completed,   shade: 'bright', sub: 'Both parties confirmed',                                          icon: <DealIcon /> },
    { label: 'Cancelled Deals',    value: stats.transactions.cancelled,   shade: 'dim',   sub: 'Transactions cancelled',                                          icon: <XIcon /> },
    { label: 'Total Reviews',      value: stats.reviews.total,            shade: 'mid',   sub: `Avg rating: ${stats.reviews.averageRating}/5`,                    icon: <StarIcon /> },
    { label: 'Avg Trust Score',    value: `${stats.avgTrustScore}/100`,   shade: 'bright', sub: 'Across all users',                                                icon: <ShieldIcon /> },
    { label: 'Suspended / Banned', value: `${stats.users.suspended} / ${stats.users.banned}`, shade: 'dim', sub: 'Account restrictions',                          icon: <BanIcon /> },
  ] : []

  return (
    <div className="space-y-8 max-w-7xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Marketplace overview — live statistics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((c) => <StatCard key={c.label} {...c} />)
        }
      </div>

      {/* Charts */}
      {!loading && charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <ChartCard title="New Users — Last 30 Days">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts.newUsers} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={shortDate} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#818cf8' }}
                  labelFormatter={shortDate}
                />
                <Area type="monotone" dataKey="count" name="Users" stroke="#6366f1" strokeWidth={2} fill="url(#colorUsers)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="New Listings — Last 30 Days">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts.newListings} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={shortDate} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#818cf8' }}
                  labelFormatter={shortDate}
                />
                <Area type="monotone" dataKey="count" name="Listings" stroke="#818cf8" strokeWidth={2} fill="url(#colorListings)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Completed Transactions — Last 30 Days">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts.newTransactions} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a5b4fc" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a5b4fc" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={shortDate} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#a5b4fc' }}
                  labelFormatter={shortDate}
                />
                <Area type="monotone" dataKey="count" name="Deals" stroke="#a5b4fc" strokeWidth={2} fill="url(#colorTx)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="User Role Distribution">
            {charts.roleDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={charts.roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.roleDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 10, fontSize: 12 }}
                    itemStyle={{ color: '#cbd5e1' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">No data</div>
            )}
          </ChartCard>

        </div>
      )}
    </div>
  )
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

const ic = (d) => () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)

const UsersIcon  = ic('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z')
const UserIcon   = ic('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')
const StoreIcon  = ic('M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z')
const ListIcon   = ic('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2')
const CheckIcon  = ic('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z')
const PauseIcon  = ic('M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z')
const TagIcon    = ic('M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z')
const DealIcon   = ic('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4')
const XIcon      = ic('M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z')
const StarIcon   = ic('M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z')
const ShieldIcon = ic('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z')
const BanIcon    = ic('M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636')
