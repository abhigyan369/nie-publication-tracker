import logger from '../utils/logger.util.js'
import { ApiError } from '../utils/response.util.js'

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err

  // Log error details
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  })

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    // P2002 = Unique constraint violation
    if (err.code === 'P2002') {
      error = ApiError.conflict('A record with this value already exists')
    }
    // P2025 = Record not found
    if (err.code === 'P2025') {
      error = ApiError.notFound('Record not found')
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token')
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired')
  }

  // Cast error to ApiError if needed
  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal server error'

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  })
}
