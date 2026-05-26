const http    = require('http')
const { Server } = require('socket.io')
const app     = require('./app')
const { registerChatSocket } = require('./Sockets/chatSocket')

const PORT = process.env.PORT || 3001

const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})

registerChatSocket(io)

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Health: http://localhost:${PORT}/health`)
})
