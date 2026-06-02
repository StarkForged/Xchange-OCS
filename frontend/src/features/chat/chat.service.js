import { getOrCreateChatAPI, getChatsAPI, getMessagesAPI, deleteMessageAPI } from '../../api/chat.api'

// Returns the chat document — caller stores chat._id as chatId
// chat.participants is populated: [{ _id, name }]
export const getOrCreateChat = async (listingId) => {
  const { chat } = await getOrCreateChatAPI(listingId)
  return chat
}

// Returns conversations normalised for ChatDashboard.
// Listing data is embedded from the getChats populate — no N+1 calls needed.
// sellerId lets the UI split into Buying / Selling tabs.
export const getConversations = async () => {
  const { chats } = await getChatsAPI()

  return chats.map((chat) => ({
    chatId:    String(chat._id),
    listingId: String(chat.listing?._id || chat.listing),
    sellerId:  String(chat.listing?.seller || ''),
    listing: {
      _id:    String(chat.listing?._id || chat.listing),
      title:  chat.listing?.title  || '',
      images: chat.listing?.images || [],
      price:  chat.listing?.price  || null,
      status: chat.listing?.status || 'active',
    },
    participants: (chat.participants || []).map((p) => ({
      _id:  String(p._id),
      name: p.name || 'User',
    })),
    lastMessage: chat.lastMessage?.text
      ? {
          senderId:  String(chat.lastMessage.sender),
          text:      chat.lastMessage.text,
          timestamp: chat.lastMessage.createdAt,
        }
      : null,
  }))
}

// Returns messages normalised by the backend: [{ id, senderId, text, timestamp, isDeleted }]
export const getMessages = async (chatId) => {
  const { messages } = await getMessagesAPI(chatId)
  return messages
}

export const deleteMessage = async (chatId, messageId) => {
  return deleteMessageAPI(chatId, messageId)
}
