const Chat    = require('../Models/Chat')
const Message = require('../Models/Message')

const users = new Map() // userId → socket.id

const registerChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // Client registers their userId so server can track online status
    socket.on('register', ({ userId }) => {
      if (!userId) return
      users.set(userId, socket.id)
      io.emit('user_online', userId)
      console.log(`[socket] registered: ${userId}`)
    })

    // Client joins a chat room (one room per listing)
    socket.on('join_chat', ({ listingId }) => {
      const room = `chat_${listingId}`
      socket.join(room)
      console.log(`[socket] ${socket.id} joined ${room}`)
    })

    // Client sends a message:
    // 1. Save to MongoDB
    // 2. Update chat's lastMessage
    // 3. Broadcast normalised message to the room
    socket.on('send_message', async ({ listingId, chatId, message }) => {
      const room = `chat_${listingId}`

      // Build the normalised payload used by the frontend
      const normalised = {
        id:        message.id || `msg_${Date.now()}`,
        senderId:  message.senderId,
        text:      message.text,
        timestamp: message.timestamp || new Date().toISOString(),
      }

      // Persist if we have a valid chatId
      if (chatId && message.senderId && message.text) {
        try {
          console.log({
  chatId,
  sender: message.senderId,
  text: message.text,
})
          const saved = await Message.create({
            chat:   chatId,
            sender: message.senderId,
            text:   message.text,
          })

          await Chat.findByIdAndUpdate(chatId, {
            lastMessage: {
              text:      message.text,
              sender:    message.senderId,
              createdAt: saved.createdAt,
            },
          })

          // Use the DB-generated id and timestamp
          normalised.id        = String(saved._id)
          normalised.timestamp = saved.createdAt.toISOString()
        } catch (err) {
          console.error('[socket] message persist failed:', err)
          // Broadcast the optimistic payload even if DB write failed
        }
      }

      socket.to(room).emit('receive_message', normalised)
    })

    // Typing indicators
    socket.on('typing', ({ listingId, userId }) => {
      socket.to(`chat_${listingId}`).emit('user_typing', userId)
    })

    socket.on('stop_typing', ({ listingId, userId }) => {
      socket.to(`chat_${listingId}`).emit('user_stop_typing', userId)
    })

    // Client explicitly leaves a room (on conversation switch / unmount)
    socket.on('leave_chat', ({ listingId }) => {
      const room = `chat_${listingId}`
      socket.leave(room)
      console.log(`[socket] ${socket.id} left ${room}`)
    })

    socket.on('disconnect', () => {
      for (const [userId, sid] of users.entries()) {
        if (sid === socket.id) {
          users.delete(userId)
          io.emit('user_offline', userId)
          console.log(`[socket] offline: ${userId}`)
          break
        }
      }
      console.log(`[socket] disconnected: ${socket.id}`)
    })
  })
}

module.exports = { registerChatSocket }
