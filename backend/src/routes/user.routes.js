import { Router } from 'express'
import { param, body } from 'express-validator'
import userController from '../controllers/user.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Get all users (admin only)
router.get('/', authorize('ADMIN', 'HOD'), userController.getAllUsers)

// Get user by ID
router.get('/:id',
  param('id').isString().withMessage('Invalid user ID'),
  validate,
  userController.getUserById
)

// Update user
router.put('/:id',
  param('id').isString().withMessage('Invalid user ID'),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('department').optional().trim(),
  body('designation').optional().trim(),
  validate,
  userController.updateUser
)

// Delete user (admin only)
router.delete('/:id',
  authorize('ADMIN'),
  param('id').isString().withMessage('Invalid user ID'),
  validate,
  userController.deleteUser
)

export default router
