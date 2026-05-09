import logger from '../utils/logger.util.js'

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
  logger.warn({
    message: 'Route not found',
    path: req.path,
    method: req.method,
    ip: req.ip,
  })

  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  })
}
