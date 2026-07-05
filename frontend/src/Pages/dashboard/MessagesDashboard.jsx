import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getConversations } from '../../features/chat/chat.service'
import { NO_IMAGE_PLACEHOLDER as defaultImage } from '../../constants/placeholderImage'

const timeAgo = (ts) => {
  if (!ts) return ''
  const diff  = Date.now() - new Date(ts)
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'Just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Listing data is now embedded in the conversation by the service — no extra fetch needed.
function ConversationCard({ convo }) {
  const navigate   = useNavigate()
  const listing    = convo.listing
  const hasMessage = !!convo.lastMessage?.text

  return (
    <button
      onClick={() => navigate(`/chat/${convo.listingId}`)}
      className="group w-full flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 p-4 text-left transition-all duration-200"
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
        <img
          src={listing?.images?.[0] || defaultImage}
          alt={listing?.title || 'Listing'}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {listing?.title || 'Listing'}
        </p>
        {listing?.price?.amount && (
          <p className="text-xs font-bold text-indigo-600 mt-0.5">
            ₹{listing.price.amount.toLocaleString('en-IN')}
          </p>
        )}
        {hasMessage && (
          <p className="text-xs text-gray-400 truncate mt-1 max-w-[280px]">
            {convo.lastMessage.text}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 text-right space-y-1">
        <p className="text-[11px] text-gray-400 font-medium">
          {timeAgo(convo.lastMessage?.timestamp)}
        </p>
        <div className="flex justify-end">
          <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}

export default function MessagesDashboard() {
  const [convos, setConvos]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // Listing data is embedded — single API call, no per-conversation fetches
        const data = await getConversations()
        if (!cancelled) setConvos(data)
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="max-w-3xl space-y-6">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
          <p className="text-sm text-gray-400 mt-1">
            {loading ? 'Loading...' : `${convos.length} conversation${convos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          to="/chat"
          className="flex items-center gap-2 border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-600 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Full Chat View
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && convos.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-base font-semibold text-gray-700 mb-1">No conversations yet</p>
          <p className="text-sm text-gray-400 mb-6">
            Start a conversation by messaging a seller on any listing
          </p>
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Browse Listings
          </Link>
        </div>
      )}

      {!loading && convos.length > 0 && (
        <div className="space-y-3">
          {convos.map((convo) => (
            <ConversationCard key={convo.chatId || convo.listingId} convo={convo} />
          ))}
        </div>
      )}

      {!loading && convos.length > 0 && (
        <div className="text-center pt-2">
          <Link to="/chat" className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
            Open full messaging experience →
          </Link>
        </div>
      )}
    </div>
  )
}
