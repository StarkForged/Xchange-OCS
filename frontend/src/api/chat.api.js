import { initialChats } from '../mock/chat'

const CHAT_KEY = (listingId) => `xchange_chat_${listingId}`
const delay = (ms) => new Promise((res) => setTimeout(res, ms))

// GET /api/chat/:listingId/messages
export const getMessagesAPI = async (listingId) => {
  await delay(300)
  const stored = localStorage.getItem(CHAT_KEY(listingId))
  if (stored) return { messages: JSON.parse(stored) }
  const seeded = initialChats[listingId] ?? []
  localStorage.setItem(CHAT_KEY(listingId), JSON.stringify(seeded))
  return { messages: seeded }
}

// GET /api/chat/conversations
export const getConversationsAPI = async () => {
  await delay(300)
  const listingIds = Object.keys(initialChats)
  const conversations = listingIds
    .map((listingId) => {
      const stored = localStorage.getItem(CHAT_KEY(listingId))
      const messages = stored ? JSON.parse(stored) : (initialChats[listingId] ?? [])
      if (!messages.length) return null
      const lastMessage = messages[messages.length - 1]
      return { listingId, lastMessage, totalMessages: messages.length }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp))
  return { conversations }
}

// POST /api/chat/:listingId/messages
export const sendMessageAPI = async (listingId, { senderId, text }) => {
  await delay(120)
  const stored = localStorage.getItem(CHAT_KEY(listingId))
  const existing = stored ? JSON.parse(stored) : (initialChats[listingId] ?? [])
  const newMsg = {
    id: `msg_${Date.now()}`,
    senderId,
    text,
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(CHAT_KEY(listingId), JSON.stringify([...existing, newMsg]))
  return { message: newMsg }
}
