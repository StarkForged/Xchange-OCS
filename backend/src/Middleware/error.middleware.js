const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` })
}

const errorHandler = (err, req, res, _next) => {
  const isMongooseValidation = err.name === 'ValidationError' && err.errors
  const statusCode = err.statusCode || (isMongooseValidation ? 400 : 500)
  const message = isMongooseValidation
    ? Object.values(err.errors).map((e) => e.message).join(', ')
    : err.message || 'Internal Server Error'

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
