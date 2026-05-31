import api from './axios'

// POST /api/chats  — get or create chat for this listing
export const getOrCreateChatAPI = async (listingId) => {
  const response = await api.post('/chats', { listingId })
  return response.data
}

// GET /api/chats  — all conversations for the logged-in user
export const getChatsAPI = async () => {
  const response = await api.get('/chats')
  return response.data
}

// GET /api/chats/:chatId/messages
export const getMessagesAPI = async (chatId) => {
  const response = await api.get(`/chats/${chatId}/messages`)
  return response.data
}

// DELETE /api/chats/:chatId/messages/:messageId
export const deleteMessageAPI = async (chatId, messageId) => {
  const response = await api.delete(`/chats/${chatId}/messages/${messageId}`)
  return response.data
}
