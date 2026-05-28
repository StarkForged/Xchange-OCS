require('dotenv').config()

const http = require('http')
const { Server } = require('socket.io')
const app = require('./app')
const connectDB = require('./Config/db')
const { registerChatSocket } = require('./Sockets/chatSocket')

const PORT = parseInt(process.env.PORT, 10) || 5000

const start = async () => {
  await connectDB()

  const httpServer = http.createServer(app)

  const io = new Server(httpServer, {
    cors: {
      origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
  })

  registerChatSocket(io)

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(`Health: http://localhost:${PORT}/health`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
