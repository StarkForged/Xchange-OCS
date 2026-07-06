const express = require('express')
const cors = require('cors')

const authRoutes         = require('./Routes/auth.routes')
const listingRoutes      = require('./Routes/listing.routes')
const chatRoutes         = require('./Routes/chat.routes')
const userRoutes         = require('./Routes/user.routes')
const notificationRoutes = require('./Routes/notification.routes')
const reviewRoutes       = require('./Routes/review.routes')
const reportRoutes       = require('./Routes/report.routes')
const adminRoutes        = require('./Routes/admin.routes')
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

app.use('/api/auth',          authRoutes)
app.use('/api/listings',      listingRoutes)
app.use('/api/chats',         chatRoutes)
app.use('/api/users',         userRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reviews',       reviewRoutes)
app.use('/api/reports',       reportRoutes)
app.use('/api/admin',         adminRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
