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

    // Client sends a message → broadcast to everyone else in the room
    socket.on('send_message', ({ listingId, message }) => {
      const room = `chat_${listingId}`
      socket.to(room).emit('receive_message', message)
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
