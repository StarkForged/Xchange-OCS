import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getProfileAPI } from '../../api/auth.api'
import { verifyPhoneAPI, appealModerationAPI } from '../../api/user.api'
import { TrustHero } from '../../components/trust/SellerReputationCard'

// ═══════════════════════════════════════════════════════════════════════════
// Trust Centre (Phase 12D.1) — the single, private place an account owner
// can see everything about their own trust: badge/tier, all five pillars,
// numeric score, history, moderation record, recovery progress, and critical
// strike status. Nothing on this page is ever shown to other users — the
// route lives inside the dashboard's ProtectedRoute and only ever reads the
// logged-in user's own profile (no :userId param exists for this page).
// ═══════════════════════════════════════════════════════════════════════════

const SEVERITY_META = {
  minor:    { label: 'Minor',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  medium:   { label: 'Medium',   cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical: { label: 'Critical', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// "Updated Today • 11:42 AM" / "Updated 2 hours ago" / "Updated 5 days ago"
function formatUpdated(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diffHrs = (now - d) / 3_600_000
  if (d.toDateString() === now.toDateString()) {
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `Updated Today • ${time}`
  }
  if (diffHrs < 48) {
    const hrs = Math.max(1, Math.round(diffHrs))
    return `Updated ${hrs} hour${hrs === 1 ? '' : 's'} ago`
  }
  const days = Math.round(diffHrs / 24)
  if (days < 30) return `Updated ${days} day${days === 1 ? '' : 's'} ago`
  return `Updated ${formatDate(d)}`
}

// Trust History (Phase 12D Final Polish) — every event gets a plain-language
// headline plus the pillar it affected, so owners understand WHY their
// reputation moved without us re-deriving or exposing internal formulas.
const HISTORY_TYPE_META = {
  account_created:          { title: 'Account Created',                  pillar: 'Identity Pillar' },
  email_verified:           { title: 'Email Verification Completed',     pillar: 'Identity Pillar' },
  phone_verified:           { title: 'Phone Verification Completed',     pillar: 'Identity Pillar' },
  profile_completed:        { title: 'Profile Completed',                pillar: 'Identity Pillar' },
  verified_seller_approved: { title: 'Verified Seller Approved',         pillar: 'Identity Pillar' },
  verified_seller_revoked:  { title: 'Verified Seller Status Revoked',   pillar: 'Identity Pillar' },
  transaction_completed:    { title: 'Successful Exchange',              pillar: 'Transaction Pillar' },
  review_received:          { title: 'Positive Review Received',         pillar: 'Reviews Pillar' },
  listing_moderated:        { title: 'Moderation Action Applied',        pillar: 'Safety Pillar' },
  trust_recovery:           { title: 'Trust Recovery',                   pillar: 'Multiplier' },
  appeal_submitted:         { title: 'Appeal Submitted',                 pillar: 'Moderation' },
}

function historyMeta(h) {
  const base = HISTORY_TYPE_META[h.type] || { title: h.description || 'Trust Updated', pillar: null }
  // Critical moderation gets its own headline + an explicit note that the
  // Trust Penalty Multiplier kicked in, matching how buyers/owners should
  // read this event without needing to know the underlying mechanics.
  if (h.type === 'listing_moderated' && /critical/i.test(h.description || '')) {
    return { title: 'Critical Moderation Applied', pillar: 'Safety Pillar', note: 'Trust Protection Multiplier Activated' }
  }
  return base
}

function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 ${className}`}>
      {(title || subtitle) && (
        <div>
          {title && <h3 className="text-sm font-bold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

function PillarCard({ label, value, description }) {
  const pct = Math.min(100, Math.round((value / 20) * 100))
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : pct >= 20 ? 'bg-sky-500' : 'bg-gray-300'
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-gray-700">{label}</span>
        <span className="text-xs font-black text-gray-900">{value}<span className="text-gray-400 font-semibold">/20</span></span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

export default function TrustCentrePage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState('')
  const [busyId, setBusyId]   = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await getProfileAPI()
      setData(res)
    } catch {
      // silent — page shows nothing meaningful without data anyway
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const handleVerifyPhone = async () => {
    try {
      await verifyPhoneAPI()
      showToast('✓ Phone verified')
      load()
    } catch (e) {
      showToast(`✗ ${e.response?.data?.message || e.message}`)
    }
  }

  const handleAppeal = async (recordId) => {
    setBusyId(recordId)
    try {
      await appealModerationAPI(recordId)
      showToast('✓ Appeal submitted')
      load()
    } catch (e) {
      showToast(`✗ ${e.response?.data?.message || e.message}`)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-gray-500">Couldn't load your Trust Centre right now.</p>
  }

  const { user, trust, trustHistory = [] } = data
  const p = trust?.pillars || { identity: 0, transactions: 0, reviews: 0, activity: 0, moderation: 0 }
  const underPenalty = (trust?.multiplier ?? 1) < 1
  const criticalStrikes = user.criticalStrikes ?? 0
  const isBanned = user.accountStatus === 'banned' && criticalStrikes >= 2
  const moderationRecord = user.moderationRecord || []
  const hasModerationHistory = moderationRecord.length > 0

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trust Centre</h1>
        <p className="text-sm text-gray-400 mt-1">
          Everything about your trust on Xchange — visible only to you.
        </p>
      </div>

      {/* ═══ Critical Moderation Notification ═══ */}
      {criticalStrikes >= 1 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-2.5">
          <h3 className="text-sm font-bold text-rose-800">Trust Status Updated</h3>
          <p className="text-xs text-rose-700 leading-relaxed">
            A recent moderation review confirmed a <strong>critical marketplace policy violation</strong>. As a result:
          </p>
          <ul className="text-xs text-rose-700 space-y-1 pl-1">
            <li className="flex gap-2"><span>•</span><span>Your Moderation &amp; Safety pillar has been reduced.</span></li>
            <li className="flex gap-2"><span>•</span><span>A Trust Penalty has been applied.</span></li>
            <li className="flex gap-2"><span>•</span><span>Your public trust badge has changed.</span></li>
          </ul>
          <p className="text-xs text-rose-700 leading-relaxed">
            You can gradually rebuild trust through genuine marketplace participation.
          </p>
          {!isBanned && (
            <p className="text-xs font-bold text-rose-800 bg-rose-100 border border-rose-200 rounded-lg px-3 py-2">
              One more confirmed critical violation will permanently ban your account.
            </p>
          )}
        </div>
      )}

      {/* ═══ Hero Card — premium Trust Badge, tier & timestamp first; no score chasing ═══ */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <TrustHero trust={trust} size="md" />
          <div className="min-w-0 flex-1 basis-40">
            <p className="text-sm font-bold text-gray-900">
              {'★'.repeat(trust?.tierStars ?? 1)} {trust?.tier}
            </p>
            {formatUpdated(trust?.lastCalculatedAt) && (
              <p className="text-[11px] text-gray-400 mt-1">{formatUpdated(trust.lastCalculatedAt)}</p>
            )}
          </div>
        </div>

        {underPenalty && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            A Trust Penalty is currently active on your account — see Recovery below.
          </p>
        )}

        <button
          onClick={() => setShowDetails((v) => !v)}
          className="w-full text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
        >
          {showDetails ? 'Hide Detailed Trust Analysis' : 'View Detailed Trust Analysis'}
        </button>
      </Card>

      {/* ═══ Detailed Trust Analysis — numeric score + five pillars, only on request ═══ */}
      {showDetails && (
        <Card title="Detailed Trust Analysis" subtitle="Only visible to you">
          <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <span className="text-xs font-semibold text-gray-600">Numeric Trust Score</span>
            <span className="text-2xl font-black text-gray-900">{trust?.displayed ?? 0}<span className="text-sm text-gray-400 font-semibold">/100</span></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PillarCard label="Identity & Verification" value={p.identity} description="Email, phone, profile completeness, admin verification." />
            <PillarCard label="Transaction History"      value={p.transactions} description="Completed deals, with diminishing returns after the first few." />
            <PillarCard label="Reviews"                  value={p.reviews} description="Weighted rating plus a small bonus for review volume." />
            <PillarCard label="Marketplace Activity"     value={p.activity} description="Active tenure, response behaviour, and healthy listings." />
            <PillarCard label="Moderation & Safety"      value={p.moderation} description="Starts at 20 — only confirmed moderation reduces it." />
          </div>

          {!user.phoneVerified && user.phone && (
            <button
              onClick={handleVerifyPhone}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors"
            >
              Verify phone number →
            </button>
          )}
          {!user.phone && (
            <Link to="/dashboard/settings" className="inline-block text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors">
              Add a phone number →
            </Link>
          )}
        </Card>
      )}

      {/* ═══ Trust Reasons ═══ */}
      <Card title="Trust Reasons" subtitle="Why buyers trust you — shown on your public profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(trust?.reasons || []).map((r) => (
            <div key={r} className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
              <span className="text-xs font-semibold text-emerald-800">{r}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ═══ Recovery Card ═══ */}
      {underPenalty && (
        <Card title="Recovery Progress">
          <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <span className="text-xs font-semibold text-gray-600">Current Trust Multiplier</span>
            <span className="text-lg font-black text-rose-600">{trust.multiplier.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">To improve your marketplace reputation:</p>
          <ul className="space-y-1.5">
            {[
              'Complete successful transactions',
              'Receive positive reviews',
              'Maintain clean marketplace behaviour',
              'Avoid further policy violations',
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ═══ Moderation Status Card ═══ */}
      {hasModerationHistory && (
        <Card title="Moderation History" subtitle="Confirmed moderation actions on your listings">
          <div className="space-y-3">
            {[...moderationRecord].reverse().map((m) => {
              const meta = SEVERITY_META[m.severity] || SEVERITY_META.minor
              const canAppeal = m.severity !== 'minor' && m.appealStatus === 'none'
              return (
                <div key={m._id} className="border border-gray-100 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
                    <span className="text-[10px] text-gray-400">{formatDate(m.confirmedAt)}</span>
                  </div>
                  {m.reason && <p className="text-xs text-gray-600">{m.reason}</p>}
                  {m.appealStatus === 'pending' && (
                    <p className="text-[11px] font-semibold text-amber-600">Appeal submitted — awaiting review</p>
                  )}
                  {canAppeal && (
                    <button
                      onClick={() => handleAppeal(m._id)}
                      disabled={busyId === m._id}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {busyId === m._id ? 'Submitting…' : 'Appeal Moderation Decision'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ═══ Critical Strike / Account Standing Card ═══ */}
      <Card title="Account Standing">
        {criticalStrikes === 0 ? (
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <span className="text-emerald-600">✅</span>
            <p className="text-xs font-semibold text-emerald-800">Good standing — no confirmed critical violations.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-600">⚠</span>
              <p className="text-xs font-semibold text-amber-800">Warning</p>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-gray-500">Critical Violations</span>
              <span className="text-sm font-black text-gray-900">{Math.min(criticalStrikes, 2)} of 2</span>
            </div>
            {!isBanned && (
              <p className="text-[11px] text-rose-600">
                One more confirmed critical violation will permanently ban this account.
              </p>
            )}
            {isBanned && (
              <p className="text-[11px] font-bold text-rose-700">This account has been permanently banned.</p>
            )}
          </div>
        )}
      </Card>

      {/* ═══ Trust History Timeline ═══ */}
      <Card title="Trust History" subtitle="Every event that has moved your trust score — private to you">
        {trustHistory.length === 0 ? (
          <p className="text-xs text-gray-400">No trust events recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {trustHistory.slice(0, 20).map((h, i) => {
              const meta = historyMeta(h)
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${h.delta > 0 ? 'bg-emerald-500' : h.delta < 0 ? 'bg-rose-500' : 'bg-gray-300'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-800">{meta.title}</p>
                      {h.delta !== 0 && (
                        <span className={`text-[10px] font-bold flex-shrink-0 ${h.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.delta > 0 ? '+' : ''}{h.delta} Trust Score
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {meta.pillar && (
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
                          {meta.pillar}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{formatDate(h.createdAt)}</span>
                    </div>
                    {h.description && meta.title !== h.description && (
                      <p className="text-[11px] text-gray-500 mt-1">{h.description}</p>
                    )}
                    {meta.note && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1">{meta.note}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl transition-all ${
          toast.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {toast}
        </div>
      )}
    </div>
  )
}
