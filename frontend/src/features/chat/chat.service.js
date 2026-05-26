import { getMessagesAPI, sendMessageAPI, getConversationsAPI } from '../../api/chat.api'

export const getConversations = async () => {
  const res = await getConversationsAPI()
  return res.conversations
}

export const getMessages = async (listingId) => {
  const res = await getMessagesAPI(listingId)
  return res.messages
}

export const sendMessage = async (listingId, { senderId, text }) => {
  const res = await sendMessageAPI(listingId, { senderId, text })
  return res.message
}
