import { Router } from 'express'
import { body, param } from 'express-validator'
import authController from '../controllers/auth.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = Router()

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * POST /api/v1/auth/register
 * Register new user account
 */
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .custom((value) => {
        // Restrict to institutional emails
        const allowedDomains = ['nie.edu', 'nie.ac.in', 'edu.in']
        const domain = value.split('@')[1]?.toLowerCase()
        if (domain && !allowedDomains.includes(domain)) {
          // Allow any email for demo, but log it
          console.log(`Non-institutional email used: ${value}`)
        }
        return true
      }),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage('Password must contain at least one special character'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Department name is too long'),
    body('designation')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Designation is too long'),
  ],
  validate,
  authController.register
)

/**
 * POST /api/v1/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validate,
  authController.login
)

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
  ],
  validate,
  authController.forgotPassword
)

/**
 * POST /api/v1/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage('Password must contain at least one special character'),
  ],
  validate,
  authController.resetPassword
)

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
  validate,
  authController.refreshToken
)

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * POST /api/v1/auth/logout
 * Logout current session
 */
router.post('/logout', authenticate, authController.logout)

/**
 * POST /api/v1/auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all', authenticate, authController.logoutAll)

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, authController.getCurrentUser)

/**
 * PUT /api/v1/auth/profile
 * Update user profile
 */
router.put(
  '/profile',
  authenticate,
  [
    body('firstName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('First name cannot be empty')
      .isLength({ min: 2, max: 50 }),
    body('lastName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Last name cannot be empty')
      .isLength({ min: 2, max: 50 }),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('designation')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar must be a valid URL'),
  ],
  validate,
  authController.updateProfile
)

/**
 * POST /api/v1/auth/change-password
 * Change password (requires current password)
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage('Password must contain at least one special character'),
  ],
  validate,
  authController.changePassword
)

export default router
