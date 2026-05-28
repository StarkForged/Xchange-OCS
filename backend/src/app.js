const express = require('express')
const cors = require('cors')

const authRoutes = require('./Routes/auth.routes')
const { notFound, errorHandler } = require('./Middleware/error.middleware')

const app = express()

app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
