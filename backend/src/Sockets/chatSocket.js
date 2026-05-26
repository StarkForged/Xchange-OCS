const registerChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // Client joins a chat room (one room per listing)
    socket.on('join_chat', ({ listingId }) => {
      const room = `chat_${listingId}`
      socket.join(room)
      console.log(`[socket] ${socket.id} joined ${room}`)
    })

    // Client sends a message → broadcast to everyone else in the room
    socket.on('send_message', ({ listingId, message }) => {
      const room = `chat_${listingId}`
        io.to(room).emit('receive_message', message)    })

    // Client explicitly leaves a room (on conversation switch / unmount)
    socket.on('leave_chat', ({ listingId }) => {
      const room = `chat_${listingId}`
      socket.leave(room)
      console.log(`[socket] ${socket.id} left ${room}`)
    })

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`)
    })
  })
}

module.exports = { registerChatSocket }
