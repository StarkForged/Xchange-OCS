const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${statusCode}] ${message}`)
    if (!err.isOperational) console.error(err.stack)
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && !err.isOperational
      ? { stack: err.stack }
      : {}),
  })
}

module.exports = { notFound, errorHandler }
