const Chat         = require('../Models/Chat')
const Message      = require('../Models/Message')
const Notification = require('../Models/Notification')

const users = new Map() // userId → socket.id

const registerChatSocket = (io) => {
  io.on('connection', (socket) => {

    // Track userId → socket for presence events
    socket.on('register', ({ userId }) => {
      if (!userId) return
      users.set(userId, socket.id)
      io.emit('user_online', userId)
    })

    socket.on('join_chat', ({ listingId }) => {
      socket.join(`chat_${listingId}`)
    })

    // 1. Persist to MongoDB
    // 2. Update chat lastMessage
    // 3. Ack sender with real DB id (so temp id can be swapped out)
    // 4. Broadcast to all other participants in the room
    // 5. Create notification for the receiver
    socket.on('send_message', async ({ listingId, chatId, message }) => {
      const room   = `chat_${listingId}`
      const tempId = message.id || `msg_${Date.now()}`

      const normalised = {
        id:        tempId,
        senderId:  message.senderId,
        text:      message.text,
        timestamp: message.timestamp || new Date().toISOString(),
        isDeleted: false,
      }

      if (chatId && message.senderId && message.text) {
        try {
          const saved = await Message.create({
            chat:   chatId,
            sender: message.senderId,
            text:   message.text,
          })

          const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            {
              lastMessage: {
                text:      message.text,
                sender:    message.senderId,
                createdAt: saved.createdAt,
              },
            },
            { new: true }
          ).lean()

          normalised.id        = String(saved._id)
          normalised.timestamp = saved.createdAt.toISOString()

          socket.emit('message_sent', {
            tempId,
            realId:    normalised.id,
            timestamp: normalised.timestamp,
          })

          if (updatedChat) {
            const receiverId = updatedChat.participants
              .find((p) => String(p) !== String(message.senderId))
            if (receiverId) {
              const preview = message.text.length > 80
                ? message.text.substring(0, 80) + '…'
                : message.text
              Notification.create({
                user:    receiverId,
                type:    'message',
                title:   'New Message',
                message: preview,
                link:    `/chat/${updatedChat.listing}`,
              }).catch(() => {})
            }
          }
        } catch (err) {
          console.error('[socket] message persist failed:', err)
        }
      }

      socket.to(room).emit('receive_message', normalised)
    })

    // Soft-delete — only the sender may delete
    socket.on('delete_message', async ({ messageId, chatId, listingId, userId }) => {
      try {
        const message = await Message.findOne({ _id: messageId, chat: chatId })
        if (!message || message.isDeleted) return
        if (String(message.sender) !== String(userId)) return

        message.isDeleted = true
        message.deletedAt = new Date()
        message.text      = 'This message was deleted'
        await message.save()

        io.to(`chat_${listingId}`).emit('message_deleted', { messageId: String(message._id) })
      } catch (err) {
        console.error('[socket] delete_message failed:', err)
      }
    })

    // Typing indicators
    socket.on('typing', ({ listingId, userId }) => {
      socket.to(`chat_${listingId}`).emit('user_typing', userId)
    })

    socket.on('stop_typing', ({ listingId, userId }) => {
      socket.to(`chat_${listingId}`).emit('user_stop_typing', userId)
    })

    socket.on('leave_chat', ({ listingId }) => {
      socket.leave(`chat_${listingId}`)
    })

    socket.on('disconnect', () => {
      for (const [userId, sid] of users.entries()) {
        if (sid === socket.id) {
          users.delete(userId)
          io.emit('user_offline', userId)
          break
        }
      }
    })
  })
}

module.exports = { registerChatSocket }
