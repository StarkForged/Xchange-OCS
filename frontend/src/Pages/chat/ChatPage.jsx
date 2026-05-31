import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/auth.Store'
import { getListingById } from '../../features/listings/listings.service'
import { getOrCreateChat, getMessages } from '../../features/chat/chat.service'
import { getSocket } from '../../socket'
import defaultAvatar from '../../assets/images/default-avatar.jpg'
import defaultImage from '../../assets/images/products/iphone13.jpg'

const formatPrice = (price) =>
  '₹' + (price?.amount?.toLocaleString('en-IN') ?? '0')

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

// Dedup by id; keep deleted messages even though their text may be a placeholder
const dedup = (msgs) => {
  const seen = new Set()
  return msgs.filter((m) => {
    if (!m?.id) return false
    if (!m.isDeleted && !m?.text?.trim()) return false
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

// ── Message action menu ───────────────────────────────────────────────────

function MessageMenu({ item, mine, onCopy, onDelete }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`
        absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]
        ${mine ? 'right-0' : 'left-0'} bottom-full mb-1
      `}
    >
      {!item.isDeleted && (
        <button
          onClick={onCopy}
          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Message
        </button>
      )}
      {mine && !item.isDeleted && (
        <button
          onClick={onDelete}
          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Message
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function ChatPage() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [chatId, setChatId]                 = useState(null)
  const [chatParticipants, setChatParticipants] = useState([])
  const [listing, setListing]               = useState(null)
  const [messages, setMessages]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [inputText, setInputText]           = useState('')
  const [sellerOnline, setSellerOnline]     = useState(false)
  const [sellerTyping, setSellerTyping]     = useState(false)

  // Message action menu
  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const [menuMsgId, setMenuMsgId]       = useState(null)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const typingTimer = useRef(null)
  const chatIdRef   = useRef(null)

  /* ── Get/create chat, then load listing + history ── */
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const chat = await getOrCreateChat(listingId)
        if (cancelled) return
        const cid = String(chat._id)
        setChatId(cid)
        chatIdRef.current = cid
        // Store populated participants so we can find the other person
        setChatParticipants(
          (chat.participants || []).map((p) => ({ _id: String(p._id), name: p.name || 'User' }))
        )

        const [listingData, msgs] = await Promise.all([
          getListingById(listingId),
          getMessages(cid),
        ])
        if (!cancelled) {
          setListing(listingData)
          setMessages((prev) => {
            const dbIds = new Set(msgs.map((m) => m.id))
            const extras = prev.filter((m) => m.id && !dbIds.has(m.id))
            return dedup([...msgs, ...extras])
          })
        }
      } catch (err) {
        console.error('[ChatPage] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [listingId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [loading])

  useEffect(() => {
    if (messages.length > 0)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  /* ── Socket: join room + presence + typing ── */
  useEffect(() => {
    if (loading) return
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    socket.emit('register', { userId: user?._id })
    socket.emit('join_chat', { listingId })

    // Track the other participant for presence events
    const other = chatParticipants.find((p) => p._id !== String(user?._id))
    const otherIdVal = other?._id

    const onReceive    = (msg)    => {
      if (!msg?.id || !msg?.text?.trim()) return
      setMessages((prev) => dedup([...prev, msg]))
    }
    // Server acks the sender's own message with the real DB id
    const onSent = ({ tempId, realId, timestamp }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...m, id: realId, timestamp } : m)
      )
    }
    const onDeleted    = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, text: 'This message was deleted', isDeleted: true }
            : m
        )
      )
    }
    const onOnline     = (userId) => { if (userId === otherIdVal) setSellerOnline(true) }
    const onOffline    = (userId) => { if (userId === otherIdVal) setSellerOnline(false) }
    const onTyping     = (userId) => { if (userId === otherIdVal) setSellerTyping(true) }
    const onStopTyping = (userId) => { if (userId === otherIdVal) setSellerTyping(false) }

    socket.on('receive_message',  onReceive)
    socket.on('message_sent',     onSent)
    socket.on('message_deleted',  onDeleted)
    socket.on('user_online',      onOnline)
    socket.on('user_offline',     onOffline)
    socket.on('user_typing',      onTyping)
    socket.on('user_stop_typing', onStopTyping)

    return () => {
      socket.emit('leave_chat', { listingId })
      socket.off('receive_message',  onReceive)
      socket.off('message_sent',     onSent)
      socket.off('message_deleted',  onDeleted)
      socket.off('user_online',      onOnline)
      socket.off('user_offline',     onOffline)
      socket.off('user_typing',      onTyping)
      socket.off('user_stop_typing', onStopTyping)
    }
  }, [listingId, loading, chatParticipants, user?._id])

  useEffect(() => {
    return () => { getSocket().disconnect() }
  }, [])

  const handleSend = useCallback(() => {
    const text = inputText.trim()
    if (!text || !user || !listing || !chatIdRef.current) return
    const newMsg = {
      id:        `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      senderId:  String(user._id),
      text,
      timestamp: new Date().toISOString(),
      isDeleted: false,
    }
    setMessages((prev) => dedup([...prev, newMsg]))
    setInputText('')
    inputRef.current?.focus()
    clearTimeout(typingTimer.current)
    getSocket().emit('stop_typing', { listingId, userId: user._id })
    getSocket().emit('send_message', { listingId, chatId: chatIdRef.current, message: newMsg })
  }, [inputText, user, listing, listingId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e) => {
    setInputText(e.target.value)
    if (!user || !listing) return
    const socket = getSocket()
    socket.emit('typing', { listingId, userId: user._id })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socket.emit('stop_typing', { listingId, userId: user._id })
    }, 1500)
  }

  const handleDeleteMessage = useCallback((msg) => {
    setMenuMsgId(null)
    if (!chatIdRef.current) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id
          ? { ...m, text: 'This message was deleted', isDeleted: true }
          : m
      )
    )
    getSocket().emit('delete_message', {
      messageId: msg.id,
      chatId:    chatIdRef.current,
      listingId,
      userId:    String(user?._id),
    })
  }, [listingId, user])

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setMenuMsgId(null)
  }

  // Fix: isMine uses current user's ID, not seller comparison
  const isMine = (msg) => String(msg.senderId) === String(user?._id)

  // Other participant derived from chat.participants
  const otherParticipant = chatParticipants.find((p) => p._id !== String(user?._id))
  const otherName        = otherParticipant?.name || 'User'

  const listingImg = listing?.images?.[0] ?? defaultImage
  const grouped    = groupMessages(messages)
  const canSend    = inputText.trim().length > 0

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
    <div
      className="flex flex-col h-[calc(100vh-4rem)] bg-white"
      onClick={() => setMenuMsgId(null)}
    >

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Other participant avatar + presence */}
          <div className="relative flex-shrink-0">
            <img src={defaultAvatar} alt={otherName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white transition-colors duration-300 ${sellerOnline ? 'bg-emerald-400' : 'bg-gray-300'}`} />
          </div>

          {/* Other participant name + typing */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">{otherName}</p>
            {sellerTyping ? (
              <p className="text-xs text-indigo-500 font-medium flex items-center gap-1">
                <span className="flex gap-0.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                Typing…
              </p>
            ) : (
              <p className={`text-xs font-medium transition-colors duration-300 ${sellerOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                {sellerOnline ? 'Online' : 'Offline'}
              </p>
            )}
          </div>

          {/* Listing context */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-gray-400 truncate max-w-[160px] leading-tight">{listing?.title}</p>
              <p className="text-sm font-black text-indigo-600 leading-tight">{formatPrice(listing?.price)}</p>
            </div>
            <img src={listingImg} alt={listing?.title} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50/60">
        <div className="px-4 py-6 max-w-3xl mx-auto">
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
                  Ask {otherName} about <span className="font-medium text-gray-600">{listing?.title}</span>
                </p>
              </div>
            </div>
          )}

          <div>
            {grouped.map((item, index) => {
              if (item.type === 'separator') {
                return (
                  <div key={item.id} className="flex items-center gap-3 py-5">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex-shrink-0 select-none">{item.label}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )
              }

              const prev = grouped[index - 1]
              const next = grouped[index + 1]
              const isPrevSame = prev?.type === 'msg' && prev.senderId === item.senderId
              const isNextSame = next?.type === 'msg' && next.senderId === item.senderId
              const mine       = isMine(item)
              const isMenuOpen = menuMsgId === item.id
              const showMenu   = hoveredMsgId === item.id || isMenuOpen

              const mineCorners = isPrevSame && isNextSame ? 'rounded-2xl rounded-r-lg'
                : isPrevSame  ? 'rounded-2xl rounded-tr-lg'
                : isNextSame  ? 'rounded-2xl rounded-br-lg'
                : 'rounded-2xl rounded-br-sm'

              const theirCorners = isPrevSame && isNextSame ? 'rounded-2xl rounded-l-lg'
                : isPrevSame  ? 'rounded-2xl rounded-tl-lg'
                : isNextSame  ? 'rounded-2xl rounded-bl-lg'
                : 'rounded-2xl rounded-bl-sm'

              const dotBtn = (
                <div className="relative flex-shrink-0 self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuMsgId(isMenuOpen ? null : item.id)
                    }}
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center
                      hover:bg-gray-200 text-gray-400 transition-opacity duration-150
                      ${showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                    `}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="19" cy="12" r="1.5" />
                    </svg>
                  </button>
                  {isMenuOpen && (
                    <MessageMenu
                      item={item}
                      mine={mine}
                      onCopy={() => handleCopyMessage(item.text)}
                      onDelete={() => handleDeleteMessage(item)}
                    />
                  )}
                </div>
              )

              return mine ? (
                <div
                  key={item.id}
                  className={`flex justify-end items-end gap-1.5 ${isPrevSame ? 'mt-0.5' : 'mt-4'}`}
                  onMouseEnter={() => setHoveredMsgId(item.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  {dotBtn}
                  <div className="max-w-[70%] sm:max-w-[55%]">
                    <div className={`
                      px-4 py-2.5 shadow-sm ${mineCorners}
                      ${item.isDeleted ? 'bg-gray-100 border border-gray-200' : 'bg-indigo-600'}
                    `}>
                      <p className={`text-sm leading-relaxed break-words ${item.isDeleted ? 'text-gray-400 italic' : 'text-white'}`}>
                        {item.text}
                      </p>
                    </div>
                    {!isNextSame && (
                      <p className="text-[10px] text-gray-400 mt-1 text-right pr-1 select-none">
                        {formatTime(item.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  key={item.id}
                  className={`flex items-end gap-2 ${isPrevSame ? 'mt-0.5' : 'mt-4'}`}
                  onMouseEnter={() => setHoveredMsgId(item.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  {!isNextSame ? (
                    <img src={defaultAvatar} alt={otherName} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-5 shadow-sm border border-gray-200" />
                  ) : (
                    <div className="w-7 flex-shrink-0" />
                  )}
                  <div className="max-w-[70%] sm:max-w-[55%]">
                    <div className={`
                      px-4 py-2.5 shadow-sm ${theirCorners}
                      ${item.isDeleted
                        ? 'bg-gray-50 border border-gray-200'
                        : 'bg-white border border-gray-200'}
                    `}>
                      <p className={`text-sm leading-relaxed break-words ${item.isDeleted ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                        {item.text}
                      </p>
                    </div>
                    {!isNextSame && (
                      <p className="text-[10px] text-gray-400 mt-1 pl-1 select-none">
                        {formatTime(item.timestamp)}
                      </p>
                    )}
                  </div>
                  {dotBtn}
                </div>
              )
            })}
          </div>

          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 bg-gray-100 rounded-full px-5 py-3 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:bg-white transition-all duration-150">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${otherName}…`}
              rows={1}
              className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-24 leading-relaxed"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 shadow-sm ${canSend ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:scale-105 active:scale-95' : 'bg-gray-200 cursor-not-allowed'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${canSend ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
