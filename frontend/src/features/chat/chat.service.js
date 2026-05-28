import { getOrCreateChatAPI, getChatsAPI, getMessagesAPI } from '../../api/chat.api'

// Returns the chat document — caller stores chat._id as chatId
export const getOrCreateChat = async (listingId) => {
  const { chat } = await getOrCreateChatAPI(listingId)
  return chat
}

// Returns conversations normalised to what ChatDashboard expects:
// [{ chatId, listingId, lastMessage: { senderId, text, timestamp } | null }]
export const getConversations = async () => {
  const { chats } = await getChatsAPI()

  return chats.map((chat) => ({
    chatId:    String(chat._id),
    listingId: String(chat.listing?._id || chat.listing),
    lastMessage: chat.lastMessage?.text
      ? {
          senderId:  String(chat.lastMessage.sender),
          text:      chat.lastMessage.text,
          timestamp: chat.lastMessage.createdAt,
        }
      : null,
  }))
}

// Returns messages already normalised by the backend:
// [{ id, senderId, text, timestamp }]
export const getMessages = async (chatId) => {
  const { messages } = await getMessagesAPI(chatId)
  return messages
}
