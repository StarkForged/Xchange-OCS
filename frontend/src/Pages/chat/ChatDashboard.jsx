import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import { getConversations, getMessages } from '../../features/chat/chat.service'
import { getListingById } from '../../features/listings/listings.service'
import { getSocket } from '../../socket'
import defaultAvatar from '../../assets/images/default-avatar.jpg'
import defaultImage from '../../assets/images/products/iphone13.jpg'

// ── Helpers ──────────────────────────────────────────────────────────────

const timeAgo = (ts) => {
  if (!ts) return ''
  const diff  = Date.now() - new Date(ts)
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'Now'
  if (mins  < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days  < 7)  return `${days}d`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const formatSellerName = (seller) => {
  if (!seller) return 'Seller'
  if (typeof seller === 'object') return seller.name || 'Seller'
  return 'Seller'
}

const getSellerId = (seller) => {
  if (!seller) return null
  if (typeof seller === 'object') return String(seller._id)
  return seller
}

const formatTime = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const formatDateLabel = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const buildGroups = (msgs) => {
  const items = []
  let lastDate = null
  msgs.forEach((msg) => {
    const d = new Date(msg.timestamp).toDateString()
    if (d !== lastDate) {
      items.push({ type: 'separator', id: `sep_${d}`, label: formatDateLabel(msg.timestamp) })
      lastDate = d
    }
    items.push({ type: 'msg', ...msg })
  })
  return items
}

// ── Sub-components ────────────────────────────────────────────────────────

function SidebarSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-2.5 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  )
}

function EmptyPanel({ onBrowse }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 bg-gray-50/60">
      <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-gray-600 text-base mb-1.5">Your Messages</p>
        <p className="text-sm text-gray-400 leading-relaxed max-w-[220px]">
          Select a conversation to start chatting
        </p>
      </div>
      <button
        onClick={onBrowse}
        className="mt-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        Browse listings →
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function ChatDashboard() {
  const navigate = useNavigate()
  const { user }  = useAuthStore()

  // Sidebar
  const [conversations, setConversations] = useState([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [activeId, setActiveId]           = useState(null)
  const [activeChatId, setActiveChatId]   = useState(null)

  // Active chat
  const [activeListing, setActiveListing]     = useState(null)
  const [activeMessages, setActiveMessages]   = useState([])
  const [loadingChat, setLoadingChat]         = useState(false)
  const [inputText, setInputText]             = useState('')

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // ── Load conversation list ──
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingConvos(true)
      try {
        const convos = await getConversations()
        const enriched = await Promise.all(
          convos.map(async (c) => {
            try {
              const listing = await getListingById(c.listingId)
              return { ...c, listing }
            } catch { return null }
          })
        )
        if (!cancelled) setConversations(enriched.filter(Boolean))
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingConvos(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Load chat when active conversation changes ──
  useEffect(() => {
    if (!activeId) return
    let cancelled = false
    const load = async () => {
      setLoadingChat(true)
      setActiveMessages([])
      setInputText('')
      try {
        const [listing, msgs] = await Promise.all([
          getListingById(activeId),
          getMessages(activeChatId),
        ])
        if (!cancelled) {
          setActiveListing(listing)
          setActiveMessages(msgs)
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingChat(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeId])

  // ── Scroll on initial load ──
  useEffect(() => {
    if (!loadingChat) bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [loadingChat])

  // ── Smooth scroll on new message ──
  useEffect(() => {
    if (activeMessages.length > 0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length])

  // ── Socket: join room + receive real-time messages ──
  useEffect(() => {
    if (!activeId || loadingChat) return
    const socket = getSocket()
    if (!socket.connected) socket.connect()
    socket.emit('join_chat', { listingId: activeId })
    const onReceive = (message) => {
      setActiveMessages((prev) => [...prev, message])
      setConversations((prev) =>
        prev.map((c) =>
          c.listingId === activeId ? { ...c, lastMessage: message } : c
        )
      )
    }
    socket.on('receive_message', onReceive)
    return () => {
      socket.emit('leave_chat', { listingId: activeId })
      socket.off('receive_message', onReceive)
    }
  }, [activeId, loadingChat])

  // ── Disconnect socket on unmount ──
  useEffect(() => {
    return () => { getSocket().disconnect() }
  }, [])

  // ── Send ──
  const handleSend = () => {
    const text = inputText.trim()
    if (!text || !user || !activeListing) return
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: user._id,
      text,
      timestamp: new Date().toISOString(),
    }
    setActiveMessages((prev) => [...prev, newMsg])
    setInputText('')
    inputRef.current?.focus()
    getSocket().emit('send_message', { listingId: activeId, chatId: activeChatId, message: newMsg })

    // Update sidebar preview
    setConversations((prev) =>
      prev.map((c) =>
        c.listingId === activeId ? { ...c, lastMessage: newMsg } : c
      )
    )
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Derived ──
  const isMine       = (msg) => msg.senderId !== getSellerId(activeListing?.seller)
  const isUnread     = (c)   => c.lastMessage?.senderId === getSellerId(c.listing?.seller)
  const getPreview   = (c)   => {
    const m = c.lastMessage
    if (!m) return ''
    return m.senderId === getSellerId(c.listing?.seller) ? m.text : `You: ${m.text}`
  }

  const grouped     = buildGroups(activeMessages)
  const canSend     = inputText.trim().length > 0
  const sellerName  = formatSellerName(activeListing?.seller)
  const listingImg  = activeListing?.images?.[0] ?? defaultImage

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden">

      {/* ════════════════════════════════════════
          LEFT SIDEBAR
      ════════════════════════════════════════ */}
      <aside className={`
        flex-shrink-0 w-full md:w-[320px] border-r border-gray-200
        flex flex-col bg-white
        ${activeId ? 'hidden md:flex' : 'flex'}
      `}>

        {/* Sidebar header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h1>
            <button
              onClick={() => navigate('/listings')}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors"
              title="Browse listings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 font-medium">
            {loadingConvos
              ? 'Loading…'
              : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading skeletons */}
          {loadingConvos && (
            <>{[1, 2, 3, 4].map((i) => <SidebarSkeleton key={i} />)}</>
          )}

          {/* Empty sidebar */}
          {!loadingConvos && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-16">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 mb-1">No messages yet</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Start a conversation from any listing
                </p>
              </div>
              <button
                onClick={() => navigate('/listings')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Browse listings →
              </button>
            </div>
          )}

          {/* Conversation items */}
          {!loadingConvos && conversations.map((convo) => {
            const unread   = isUnread(convo)
            const isActive = activeId === convo.listingId

            return (
              <button
                key={convo.listingId}
                onClick={() => { setActiveId(convo.listingId); setActiveChatId(convo.chatId) }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 text-left
                  border-l-[3px] transition-colors duration-150
                  ${isActive
                    ? 'bg-indigo-50/80 border-l-indigo-500'
                    : 'hover:bg-gray-50 border-l-transparent'}
                `}
              >
                {/* Round avatar (listing image) */}
                <div className="relative flex-shrink-0">
                  <img
                    src={convo.listing?.images?.[0] ?? defaultImage}
                    alt={convo.listing?.title}
                    className="w-12 h-12 rounded-full object-cover shadow-sm"
                  />
                  {unread && !isActive && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <p className={`text-sm truncate ${
                      unread && !isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
                    }`}>
                      {convo.listing?.title || 'Listing'}
                    </p>
                    <span className={`text-[10px] flex-shrink-0 tabular-nums ${
                      unread && !isActive ? 'font-bold text-indigo-500' : 'text-gray-400'
                    }`}>
                      {timeAgo(convo.lastMessage?.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs truncate leading-relaxed ${
                    unread && !isActive ? 'text-gray-700 font-medium' : 'text-gray-400'
                  }`}>
                    {getPreview(convo)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ════════════════════════════════════════
          RIGHT PANEL
      ════════════════════════════════════════ */}
      <main className={`flex-1 flex flex-col min-w-0 ${activeId ? 'flex' : 'hidden md:flex'}`}>

        {/* ── No conversation selected ── */}
        {!activeId && <EmptyPanel onBrowse={() => navigate('/listings')} />}

        {/* ── Chat loading ── */}
        {activeId && loadingChat && (
          <div className="flex-1 flex items-center justify-center gap-3 text-gray-400 bg-gray-50/60">
            <svg className="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm font-medium">Loading…</span>
          </div>
        )}

        {/* ── Active chat ── */}
        {activeId && !loadingChat && (
          <>
            {/* Chat header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
              <div className="px-4 py-3 flex items-center gap-3">

                {/* Mobile: back to list */}
                <button
                  onClick={() => setActiveId(null)}
                  className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Seller avatar + online */}
                <div className="relative flex-shrink-0">
                  <img
                    src={defaultAvatar}
                    alt="Seller"
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                </div>

                {/* Seller name + status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-tight truncate">
                    {sellerName}
                  </p>
                  <p className="text-xs text-emerald-600 font-medium">Online</p>
                </div>

                {/* Listing context (right) */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-gray-400 truncate max-w-[160px] leading-tight">
                      {activeListing?.title}
                    </p>
                    {activeListing?.price?.amount && (
                      <p className="text-sm font-black text-indigo-600 leading-tight">
                        ₹{activeListing.price.amount.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                  <img
                    src={listingImg}
                    alt={activeListing?.title}
                    className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/60">
              <div className="px-4 py-6 max-w-3xl mx-auto">

                {/* Empty chat state */}
                {activeMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600 text-sm mb-1">Start the conversation</p>
                      <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                        Ask {sellerName} about{' '}
                        <span className="font-medium text-gray-600">{activeListing?.title}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Message list */}
                <div>
                  {grouped.map((item, index) => {

                    if (item.type === 'separator') {
                      return (
                        <div key={item.id} className="flex items-center gap-3 py-5">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex-shrink-0 select-none">
                            {item.label}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )
                    }

                    // Grouping: consecutive same-sender messages get tighter spacing
                    const prev = grouped[index - 1]
                    const next = grouped[index + 1]
                    const isPrevSame = prev?.type === 'msg' && prev.senderId === item.senderId
                    const isNextSame = next?.type === 'msg' && next.senderId === item.senderId
                    const mine = isMine(item)

                    // Bubble corner rounding based on position in group
                    const mineCorners = isPrevSame && isNextSame ? 'rounded-2xl rounded-r-lg'
                      : isPrevSame  ? 'rounded-2xl rounded-tr-lg'
                      : isNextSame  ? 'rounded-2xl rounded-br-lg'
                      : 'rounded-2xl rounded-br-sm'

                    const theirCorners = isPrevSame && isNextSame ? 'rounded-2xl rounded-l-lg'
                      : isPrevSame  ? 'rounded-2xl rounded-tl-lg'
                      : isNextSame  ? 'rounded-2xl rounded-bl-lg'
                      : 'rounded-2xl rounded-bl-sm'

                    return mine ? (
                      /* ── Sent (right) ── */
                      <div
                        key={item.id}
                        className={`flex justify-end ${isPrevSame ? 'mt-0.5' : 'mt-4'}`}
                      >
                        <div className="max-w-[68%] sm:max-w-[55%]">
                          <div className={`bg-indigo-600 text-white px-4 py-2.5 shadow-sm ${mineCorners}`}>
                            <p className="text-sm leading-relaxed break-words">{item.text}</p>
                          </div>
                          {!isNextSame && (
                            <p className="text-[10px] text-gray-400 mt-1 text-right pr-1 select-none">
                              {formatTime(item.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ── Received (left) ── */
                      <div
                        key={item.id}
                        className={`flex items-end gap-2 ${isPrevSame ? 'mt-0.5' : 'mt-4'}`}
                      >
                        {/* Avatar: only on last in group, else spacer */}
                        {!isNextSame ? (
                          <img
                            src={defaultAvatar}
                            alt="Seller"
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-5 shadow-sm border border-gray-200"
                          />
                        ) : (
                          <div className="w-7 flex-shrink-0" />
                        )}
                        <div className="max-w-[68%] sm:max-w-[55%]">
                          <div className={`bg-white border border-gray-200 text-gray-800 px-4 py-2.5 shadow-sm ${theirCorners}`}>
                            <p className="text-sm leading-relaxed break-words">{item.text}</p>
                          </div>
                          {!isNextSame && (
                            <p className="text-[10px] text-gray-400 mt-1 pl-1 select-none">
                              {formatTime(item.timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div ref={bottomRef} className="h-2" />
              </div>
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
              <div className="flex items-end gap-2 max-w-3xl mx-auto">

                {/* Rounded-full input */}
                <div className="flex-1 bg-gray-100 rounded-full px-5 py-3 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:bg-white transition-all duration-150">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${sellerName}…`}
                    rows={1}
                    className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-24 leading-relaxed"
                  />
                </div>

                {/* Rounded-full send button */}
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={`
                    flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                    transition-all duration-150 shadow-sm
                    ${canSend
                      ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:scale-105 active:scale-95'
                      : 'bg-gray-200 cursor-not-allowed'}
                  `}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 ${canSend ? 'text-white' : 'text-gray-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>

              <p className="text-center text-[10px] text-gray-400 mt-2 select-none">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
