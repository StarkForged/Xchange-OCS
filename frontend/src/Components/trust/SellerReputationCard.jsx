import defaultAvatar from '../../assets/images/default-avatar.jpg'

const BADGE_COLORS = {
  top_seller:        'bg-yellow-50 border-yellow-300 text-yellow-800',
  new_seller:        'bg-sky-50 border-sky-200 text-sky-700',
  verified_seller:   'bg-indigo-50 border-indigo-200 text-indigo-700',
  active_seller:     'bg-violet-50 border-violet-200 text-violet-700',
  responsive_seller: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  quick_responder:   'bg-amber-50 border-amber-200 text-amber-700',
  trusted_seller:    'bg-orange-50 border-orange-200 text-orange-700',
  veteran_seller:    'bg-rose-50 border-rose-200 text-rose-700',
}

function trustTier(score) {
  if (score >= 90) return { label: 'Top Seller', color: 'text-yellow-800', bg: 'bg-yellow-50', border: 'border-yellow-300', bar: 'from-yellow-400 to-amber-500'  }
  if (score >= 80) return { label: 'Trusted',    color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  bar: 'from-amber-400 to-orange-500'  }
  if (score >= 50) return { label: 'Building',   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'from-emerald-400 to-teal-500' }
  if (score >  0)  return { label: 'New',        color: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-200',    bar: 'from-sky-400 to-blue-500'      }
  return                   { label: 'New',        color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',   bar: 'from-gray-300 to-gray-400'     }
}

function fmtTime(ms) {
  if (ms == null) return null
  if (ms < 3_600_000)  return `${Math.round(ms / 60_000)}m`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`
  const d = Math.round(ms / 86_400_000)
  return `${d}d`
}

function activityStatus(lastActiveAt) {
  if (!lastActiveAt) return null
  const hours = (Date.now() - new Date(lastActiveAt)) / 3_600_000
  if (hours < 24)  return { label: 'Active today',      dot: 'bg-emerald-400' }
  if (hours < 168) return { label: 'Active this week',  dot: 'bg-amber-400'   }
  if (hours < 720) return { label: 'Active this month', dot: 'bg-gray-300'    }
  return                  { label: 'Less active',        dot: 'bg-gray-200'    }
}

function memberDuration(date) {
  if (!date) return ''
  const months = Math.floor((Date.now() - new Date(date)) / (30 * 86_400_000))
  if (months < 1)  return 'New member'
  if (months < 12) return `${months}mo`
  const y = Math.floor(months / 12)
  return `${y}yr`
}

export default function SellerReputationCard({ seller }) {
  if (!seller || typeof seller !== 'object') return null

  const score    = seller.trustScore ?? 0
  const tier     = trustTier(score)
  const metrics  = seller.sellerMetrics
  const badges   = seller.badges ?? []
  const activity = activityStatus(metrics?.lastActiveAt)
  const isGhost  = seller.ghostRisk?.flagged
  const rr       = metrics?.responseRate ?? null
  const avgTime  = fmtTime(metrics?.avgResponseTimeMs)
  const hasMetrics = (metrics?.totalInquiries ?? 0) > 0

  return (
    <div className={`rounded-2xl border shadow-sm p-5 space-y-4 ${isGhost ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-gray-100'}`}>

      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
        About the Seller
        {isGhost && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
            ⚠ May be inactive
          </span>
        )}
      </h3>

      {/* Ghost seller warning */}
      {isGhost && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-xs font-bold text-amber-800">This seller may be inactive</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Low response history detected. Message them and wait for a reply before making any commitments.
            </p>
          </div>
        </div>
      )}

      {/* Seller identity row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={seller.profileImage || defaultAvatar}
            alt={seller.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
          />
          {activity && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${activity.dot} border-2 border-white rounded-full`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{seller.name || 'Unknown Seller'}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {activity && <span className="text-[10px] text-gray-500 font-medium">{activity.label}</span>}
            {seller.createdAt && (
              <span className="text-[10px] text-gray-400">
                {activity ? '· ' : ''}Member {memberDuration(seller.createdAt)}
              </span>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${tier.color} ${tier.bg} ${tier.border}`}>
          {tier.label}
        </span>
      </div>

      {/* Trust score bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trust Score</span>
          <span className="text-sm font-black text-gray-900">
            {score}<span className="text-xs font-semibold text-gray-400">/100</span>
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${tier.bar} transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Response metrics */}
      {hasMetrics && (
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-xl p-3 ${rr >= 80 ? 'bg-emerald-50' : rr >= 50 ? 'bg-amber-50' : 'bg-rose-50'}`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Response Rate</p>
            <p className={`text-xl font-black leading-none ${rr >= 80 ? 'text-emerald-600' : rr >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
              {rr}%
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              {metrics.respondedInquiries}/{metrics.totalInquiries} replied
            </p>
          </div>
          {avgTime && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Avg Reply Time</p>
              <p className="text-xl font-black text-gray-800 leading-none">{avgTime}</p>
              <p className="text-[10px] text-gray-400 mt-1">to respond</p>
            </div>
          )}
        </div>
      )}

      {!hasMetrics && (
        <p className="text-[11px] text-gray-400 italic">No inquiry data yet — be the first to message!</p>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Seller Badges</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b.id}
                title={b.description}
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${BADGE_COLORS[b.id] || 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
