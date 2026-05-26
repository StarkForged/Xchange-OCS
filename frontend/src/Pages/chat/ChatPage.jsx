import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import { getListingById } from '../../features/listings/listings.service'
import { getMessages, sendMessage } from '../../features/chat/chat.service'
import defaultAvatar from '../../assets/images/default-avatar.jpg'
import defaultImage from '../../assets/images/products/iphone13.jpg'

const formatPrice = (price) =>
  '₹' + (price?.amount?.toLocaleString('en-IN') ?? '0')

const formatSellerName = (seller) => {
  if (typeof seller !== 'string') return 'Seller'
  return `Seller #${seller.replace('user_', '')}`
}

const formatTime = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const formatDateLabel = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const groupMessages = (msgs) => {
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

export default function ChatPage() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [listing, setListing]     = useState(null)
  const [messages, setMessages]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [inputText, setInputText] = useState('')

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  /* ── Load listing + messages in parallel ── */
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [listingData, msgs] = await Promise.all([
          getListingById(listingId),
          getMessages(listingId),
        ])
        if (!cancelled) {
          setListing(listingData)
          setMessages(msgs)
        }
      } catch {
        // mock never throws network errors
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [listingId])

  /* ── Scroll to bottom on initial load ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [loading])

  /* ── Smooth scroll when new message arrives ── */
  useEffect(() => {
    if (messages.length > 0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const text = inputText.trim()
    if (!text || !user || !listing) return
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: user._id,
      text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMsg])
    setInputText('')
    inputRef.current?.focus()
    sendMessage(listingId, { senderId: user._id, text })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isMine     = (msg) => msg.senderId !== listing?.seller
  const sellerName = formatSellerName(listing?.seller)
  const listingImg = listing?.images?.[0] ?? defaultImage
  const grouped    = groupMessages(messages)
  const canSend    = inputText.trim().length > 0

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 items-center justify-center gap-3 text-gray-400">
        <svg className="animate-spin h-7 w-7 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-sm font-medium">Loading chat…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="px-4 py-3 flex items-center gap-3">

          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Seller avatar + online dot */}
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
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">
              {sellerName}
            </p>
            <p className="text-xs text-emerald-600 font-medium">Online</p>
          </div>

          {/* Listing context */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-gray-400 truncate max-w-[160px] leading-tight">
                {listing?.title}
              </p>
              <p className="text-sm font-black text-indigo-600 leading-tight">
                {formatPrice(listing?.price)}
              </p>
            </div>
            <img
              src={listingImg}
              alt={listing?.title}
              className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/60">
        <div className="px-4 py-6 max-w-3xl mx-auto">

          {/* Empty state */}
          {messages.length === 0 && (
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
                  <span className="font-medium text-gray-600">{listing?.title}</span>
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

              // Grouping helpers
              const prev = grouped[index - 1]
              const next = grouped[index + 1]
              const isPrevSame = prev?.type === 'msg' && prev.senderId === item.senderId
              const isNextSame = next?.type === 'msg' && next.senderId === item.senderId
              const mine = isMine(item)

              const mineCorners =
                isPrevSame && isNextSame ? 'rounded-2xl rounded-r-lg'
                : isPrevSame  ? 'rounded-2xl rounded-tr-lg'
                : isNextSame  ? 'rounded-2xl rounded-br-lg'
                : 'rounded-2xl rounded-br-sm'

              const theirCorners =
                isPrevSame && isNextSame ? 'rounded-2xl rounded-l-lg'
                : isPrevSame  ? 'rounded-2xl rounded-tl-lg'
                : isNextSame  ? 'rounded-2xl rounded-bl-lg'
                : 'rounded-2xl rounded-bl-sm'

              return mine ? (
                /* Sent — right */
                <div key={item.id} className={`flex justify-end ${isPrevSame ? 'mt-0.5' : 'mt-4'}`}>
                  <div className="max-w-[70%] sm:max-w-[55%]">
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
                /* Received — left */
                <div key={item.id} className={`flex items-end gap-2 ${isPrevSame ? 'mt-0.5' : 'mt-4'}`}>
                  {/* Avatar: only show on last in group */}
                  {!isNextSame ? (
                    <img
                      src={defaultAvatar}
                      alt="Seller"
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-5 shadow-sm border border-gray-200"
                    />
                  ) : (
                    <div className="w-7 flex-shrink-0" />
                  )}
                  <div className="max-w-[70%] sm:max-w-[55%]">
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

      {/* ── Input ── */}
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

    </div>
  )
}
