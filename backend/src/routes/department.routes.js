import { Router } from 'express'
import { body, param } from 'express-validator'
import departmentController from '../controllers/department.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/v1/departments - List all departments
router.get('/', departmentController.getAllDepartments)

// GET /api/v1/departments/:id - Get single department with faculty
router.get(
  '/:id',
  param('id').isString().withMessage('Invalid department ID'),
  validate,
  departmentController.getDepartmentById
)

// POST /api/v1/departments - Create department (admin only)
router.post(
  '/',
  authorize('ADMIN'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Department name is required')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('code')
      .trim()
      .notEmpty()
      .withMessage('Department code is required')
      .isLength({ max: 20 })
      .withMessage('Code must be less than 20 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description is too long'),
  ],
  validate,
  departmentController.createDepartment
)

// PUT /api/v1/departments/:id - Update department (admin only)
router.put(
  '/:id',
  authorize('ADMIN'),
  param('id').isString().withMessage('Invalid department ID'),
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty'),
    body('code')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Code cannot be empty'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  validate,
  departmentController.updateDepartment
)

// DELETE /api/v1/departments/:id - Delete department (admin only)
router.delete(
  '/:id',
  authorize('ADMIN'),
  param('id').isString().withMessage('Invalid department ID'),
  validate,
  departmentController.deleteDepartment
)

export default router
