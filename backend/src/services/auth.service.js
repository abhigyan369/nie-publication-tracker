import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../config/database.config.js'
import config from '../config/app.config.js'
import logger from '../utils/logger.util.js'
import { ApiError } from '../utils/response.util.js'

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { email, password, firstName, lastName, role, department, designation } = userData

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists')
    }

    // Validate password strength
    this.validatePassword(password)

    // Hash password with bcrypt
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString('hex')

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'FACULTY',
        department,
        designation,
        verifyToken,
        verifyTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    })

    // Generate tokens
    const token = this.generateAccessToken(user)
    const refreshToken = this.generateRefreshToken(user)

    // Log activity
    await this.logActivity(user.id, 'REGISTER', 'User', user.id, { role: user.role })

    logger.info(`New user registered: ${email}`)

    return {
      user,
      token,
      refreshToken,
      verifyToken, // In production, this would be sent via email
    }
  }

  /**
   * Login user with email and password
   */
  async login(email, password, deviceInfo = null, ipAddress = null) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      logger.warn(`Failed login attempt for email: ${email}`)
      throw ApiError.unauthorized('Invalid email or password')
    }

    // Check if account is active
    if (!user.isActive) {
      logger.warn(`Login attempt on deactivated account: ${email}`)
      throw ApiError.forbidden('Your account has been deactivated. Please contact support.')
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      logger.warn(`Failed login attempt - wrong password for: ${email}`)
      throw ApiError.unauthorized('Invalid email or password')
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Generate tokens
    const token = this.generateAccessToken(user)
    const refreshToken = this.generateRefreshToken(user)

    // Create session record
    await this.createSession(user.id, token, refreshToken, deviceInfo, ipAddress)

    // Log activity
    await this.logActivity(user.id, 'LOGIN', 'User', user.id, { ipAddress })

    logger.info(`User logged in: ${email}`)

    return {
      user: this.sanitizeUser(user),
      token,
      refreshToken,
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(userId, token) {
    // Remove session
    await prisma.session.deleteMany({
      where: { token },
    })

    // Log activity
    await this.logActivity(userId, 'LOGOUT', 'User', userId)

    logger.info(`User logged out: ${userId}`)

    return { message: 'Logged out successfully' }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await prisma.session.deleteMany({
      where: { userId },
    })

    await this.logActivity(userId, 'LOGOUT_ALL', 'User', userId)

    logger.info(`User logged out from all devices: ${userId}`)

    return { message: 'Logged out from all devices' }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        designation: true,
        avatar: true,
        isActive: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw ApiError.notFound('User not found')
    }

    return user
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token is required')
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret)

      // Check if session exists and is valid
      const session = await prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      })

      if (!session || !session.user.isActive) {
        throw ApiError.unauthorized('Session expired or invalid')
      }

      // Check expiration
      if (new Date() > session.expiresAt) {
        await prisma.session.delete({ where: { id: session.id } })
        throw ApiError.unauthorized('Session expired. Please login again.')
      }

      // Generate new tokens
      const user = this.sanitizeUser(session.user)
      const newAccessToken = this.generateAccessToken(user)
      const newRefreshToken = this.generateRefreshToken(user)

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      return {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      }
    } catch (error) {
      if (error instanceof ApiError) throw error
      logger.warn(`Token refresh failed: ${error.message}`)
      throw ApiError.unauthorized('Invalid or expired refresh token')
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message: 'If an account exists with this email, a password reset link has been sent.',
      }
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp,
      },
    })

    await this.logActivity(user.id, 'PASSWORD_RESET_REQUEST', 'User', user.id)

    logger.info(`Password reset requested for: ${email}`)

    // In production, send email with reset link containing token
    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
      resetToken, // Remove this in production - send via email instead
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token, newPassword) {
    // Find user with this reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    })

    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token')
    }

    // Validate new password
    this.validatePassword(newPassword)

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    })

    // Invalidate all existing sessions
    await prisma.session.deleteMany({
      where: { userId: user.id },
    })

    await this.logActivity(user.id, 'PASSWORD_RESET', 'User', user.id)

    logger.info(`Password reset completed for user: ${user.id}`)

    return { message: 'Password has been reset successfully. Please login with your new password.' }
  }

  /**
   * Change password for logged in user
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw ApiError.notFound('User not found')
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      throw ApiError.badRequest('Current password is incorrect')
    }

    // Validate new password
    this.validatePassword(newPassword)

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    })

    // Invalidate all sessions except current
    await prisma.session.deleteMany({
      where: { userId },
    })

    await this.logActivity(userId, 'PASSWORD_CHANGE', 'User', userId)

    logger.info(`Password changed for user: ${userId}`)

    return { message: 'Password changed successfully' }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw ApiError.notFound('User not found')
    }

    // Prevent role changes through this endpoint
    delete updateData.role
    delete updateData.isActive

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        designation: true,
        avatar: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
      },
    })

    await this.logActivity(userId, 'PROFILE_UPDATE', 'User', userId)

    return updatedUser
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Generate JWT access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: '30d' }
    )
  }

  /**
   * Create session record
   */
  async createSession(userId, token, refreshToken, deviceInfo, ipAddress) {
    await prisma.session.create({
      data: {
        userId,
        token,
        refreshToken,
        deviceInfo,
        ipAddress,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    if (!password || password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters long')
    }

    if (!/[A-Z]/.test(password)) {
      throw ApiError.badRequest('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      throw ApiError.badRequest('Password must contain at least one lowercase letter')
    }

    if (!/[0-9]/.test(password)) {
      throw ApiError.badRequest('Password must contain at least one number')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw ApiError.badRequest('Password must contain at least one special character')
    }
  }

  /**
   * Remove sensitive data from user object
   */
  sanitizeUser(user) {
    const { password, resetToken, resetTokenExp, verifyToken, verifyTokenExp, ...safeUser } = user
    return safeUser
  }

  /**
   * Log user activity
   */
  async logActivity(userId, action, entityType, entityId, details = {}) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          details,
        },
      })
    } catch (error) {
      logger.error('Failed to log activity:', error)
    }
  }
}

export default new AuthService()
