import authService from '../services/auth.service.js'
import { ApiResponse } from '../utils/response.util.js'
import logger from '../utils/logger.util.js'

class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, department, designation } = req.body

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        department,
        designation,
      })

      logger.info(`New registration: ${email}`)

      return ApiResponse.created(
        res,
        {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
        },
        'Registration successful. Welcome to NIE Publication Tracker!'
      )
    } catch (error) {
      next(error)
    }
  }

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body

      // Get client info
      const deviceInfo = req.get('User-Agent')
      const ipAddress = req.ip || req.connection.remoteAddress

      const result = await authService.login(email, password, deviceInfo, ipAddress)

      return ApiResponse.success(
        res,
        {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
        },
        'Login successful'
      )
    } catch (error) {
      next(error)
    }
  }

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      const result = await authService.logout(req.user.id, req.token)

      return ApiResponse.success(res, null, result.message)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Logout from all devices
   * POST /api/v1/auth/logout-all
   */
  async logoutAll(req, res, next) {
    try {
      const result = await authService.logoutAll(req.user.id)

      return ApiResponse.success(res, null, result.message)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id)

      return ApiResponse.success(res, user, 'Profile retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body

      const result = await authService.refreshToken(refreshToken)

      return ApiResponse.success(res, result, 'Token refreshed successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body

      const result = await authService.forgotPassword(email)

      return ApiResponse.success(res, null, result.message)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Reset password with token
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body

      const result = await authService.resetPassword(token, password)

      return ApiResponse.success(res, null, result.message)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body

      const result = await authService.changePassword(req.user.id, currentPassword, newPassword)

      return ApiResponse.success(res, null, result.message)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update profile
   * PUT /api/v1/auth/profile
   */
  async updateProfile(req, res, next) {
    try {
      const { firstName, lastName, department, designation, avatar } = req.body

      const user = await authService.updateProfile(req.user.id, {
        firstName,
        lastName,
        department,
        designation,
        avatar,
      })

      return ApiResponse.success(res, user, 'Profile updated successfully')
    } catch (error) {
      next(error)
    }
  }
}

export default new AuthController()
