import jwt from 'jsonwebtoken'
import prisma from '../config/database.config.js'
import config from '../config/app.config.js'
import logger from '../utils/logger.util.js'
import { ApiError } from '../utils/response.util.js'

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required')
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      throw ApiError.unauthorized('Access token is required')
    }

    // Verify token
    let decoded
    try {
      decoded = jwt.verify(token, config.jwt.secret)
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token has expired. Please refresh your session.')
      }
      if (error.name === 'JsonWebTokenError') {
        throw ApiError.unauthorized('Invalid access token')
      }
      throw error
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    })

    if (!user) {
      throw ApiError.unauthorized('User not found')
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated')
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    }

    // Attach raw token for session validation if needed
    req.token = token

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Role-based Authorization Middleware
 * Checks if user has one of the allowed roles
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'))
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} - Required roles: ${allowedRoles.join(', ')}`)
      return next(
        ApiError.forbidden('You do not have permission to perform this action')
      )
    }

    next()
  }
}

/**
 * Optional Authentication
 * Attaches user if token is valid, but doesn't block if not
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]

      try {
        const decoded = jwt.verify(token, config.jwt.secret)
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        })

        if (user && user.isActive) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
          }
        }
      } catch (error) {
        // Token invalid but that's okay for optional auth
        logger.debug('Optional auth token invalid or expired')
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Session Validation Middleware
 * Validates that the token exists in active sessions
 */
export const validateSession = async (req, res, next) => {
  try {
    // Check if token is in active sessions
    const session = await prisma.session.findUnique({
      where: { token: req.token },
    })

    if (!session) {
      throw ApiError.unauthorized('Session expired or invalidated. Please login again.')
    }

    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } })
      throw ApiError.unauthorized('Session expired. Please login again.')
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Admin Only Middleware
 * Convenience wrapper for admin-only routes
 */
export const adminOnly = authorize('ADMIN')

/**
 * Faculty or Admin Middleware
 * Allows faculty and admin roles
 */
export const facultyOrAdmin = authorize('FACULTY', 'ADMIN')

/**
 * HOD or Admin Middleware
 * Allows HOD and admin roles
 */
export const hodOrAdmin = authorize('HOD', 'ADMIN')

/**
 * Self or Admin Middleware
 * Allows users to access their own resources or admins to access any
 */
export const selfOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'ADMIN') {
        return next()
      }

      const resourceUserId = await getResourceUserId(req)
      if (req.user.id === resourceUserId) {
        return next()
      }

      throw ApiError.forbidden('You can only access your own resources')
    } catch (error) {
      next(error)
    }
  }
}
