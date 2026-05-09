import { Router } from 'express'
import { body, param, query } from 'express-validator'
import workflowController from '../controllers/workflow.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// ============================================
// WORKFLOW ROUTES (Admin/HOD/Reviewer)
// ============================================

// GET /api/v1/workflow/pending - Get pending publications
router.get(
  '/pending',
  authorize('ADMIN', 'HOD', 'REVIEWER'),
  workflowController.getPendingPublications
)

// GET /api/v1/workflow/stats - Get workflow statistics
router.get('/stats', authorize('ADMIN', 'HOD'), workflowController.getWorkflowStats)

// GET /api/v1/workflow/publications/:id/history - Get status history
router.get(
  '/publications/:id/history',
  param('id').isString(),
  validate,
  workflowController.getStatusHistory
)

// GET /api/v1/workflow/publications/:id/reviews - Get reviews
router.get(
  '/publications/:id/reviews',
  param('id').isString(),
  validate,
  workflowController.getReviews
)

// POST /api/v1/workflow/publications/:id/reviews - Add review
router.post(
  '/publications/:id/reviews',
  authorize('ADMIN', 'HOD', 'REVIEWER'),
  param('id').isString(),
  [
    body('comment')
      .trim()
      .notEmpty()
      .withMessage('Comment is required')
      .isLength({ max: 2000 }),
    body('isInternal')
      .optional()
      .isBoolean(),
  ],
  validate,
  workflowController.addReview
)

// POST /api/v1/workflow/publications/:id/approve - Approve publication
router.post(
  '/publications/:id/approve',
  authorize('ADMIN', 'HOD'),
  param('id').isString(),
  [
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 1000 }),
  ],
  validate,
  workflowController.approve
)

// POST /api/v1/workflow/publications/:id/reject - Reject publication
router.post(
  '/publications/:id/reject',
  authorize('ADMIN', 'HOD'),
  param('id').isString(),
  [
    body('comment')
      .trim()
      .notEmpty()
      .withMessage('Rejection reason is required')
      .isLength({ max: 1000 }),
  ],
  validate,
  workflowController.reject
)

// POST /api/v1/workflow/publications/:id/revision - Request revisions
router.post(
  '/publications/:id/revision',
  authorize('ADMIN', 'HOD', 'REVIEWER'),
  param('id').isString(),
  [
    body('comment')
      .trim()
      .notEmpty()
      .withMessage('Revision comments are required')
      .isLength({ max: 1000 }),
  ],
  validate,
  workflowController.requestRevision
)

// POST /api/v1/workflow/publications/:id/under-review - Mark as under review
router.post(
  '/publications/:id/under-review',
  authorize('ADMIN', 'HOD'),
  param('id').isString(),
  workflowController.markUnderReview
)

// POST /api/v1/workflow/publications/:id/publish - Mark as published
router.post(
  '/publications/:id/publish',
  authorize('ADMIN'),
  param('id').isString(),
  [
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 1000 }),
  ],
  validate,
  workflowController.publish
)

// ============================================
// FACULTY ROUTES
// ============================================

// POST /api/v1/workflow/publications/:id/submit - Submit for review
router.post(
  '/publications/:id/submit',
  param('id').isString(),
  validate,
  workflowController.submitForReview
)

// DELETE /api/v1/workflow/publications/:id - Soft delete
router.delete(
  '/publications/:id',
  param('id').isString(),
  validate,
  workflowController.softDelete
)

// POST /api/v1/workflow/publications/:id/restore - Restore (admin only)
router.post(
  '/publications/:id/restore',
  authorize('ADMIN'),
  param('id').isString(),
  validate,
  workflowController.restore
)

// ============================================
// ACTIVITY LOGS
// ============================================

router.get('/activity-logs', authorize('ADMIN', 'HOD'), workflowController.getActivityLogs)

// ============================================
// NOTIFICATIONS
// ============================================

router.get('/notifications', workflowController.getNotifications)
router.get('/notifications/unread-count', workflowController.getUnreadCount)
router.post('/notifications/:id/read', workflowController.markAsRead)
router.post('/notifications/read-all', workflowController.markAllAsRead)

export default router
