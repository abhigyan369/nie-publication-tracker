import { Router } from 'express'
import { query } from 'express-validator'
import analyticsController from '../controllers/analytics.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// ============================================
// ANALYTICS ROUTES
// ============================================

// GET /api/v1/analytics/overview - Get dashboard overview
router.get(
  '/overview',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('department').optional().isString(),
  ],
  validate,
  analyticsController.getOverview
)

// GET /api/v1/analytics/departments - Department-wise analytics
router.get(
  '/departments',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validate,
  analyticsController.getDepartmentAnalytics
)

// GET /api/v1/analytics/monthly - Monthly trends
router.get(
  '/monthly',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('department').optional().isString(),
  ],
  validate,
  analyticsController.getMonthlyTrends
)

// GET /api/v1/analytics/yearly - Yearly trends
router.get('/yearly', analyticsController.getYearlyTrends)

// GET /api/v1/analytics/citations - Citation analysis
router.get(
  '/citations',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('department').optional().isString(),
  ],
  validate,
  analyticsController.getCitationAnalysis
)

// GET /api/v1/analytics/leaderboard - Faculty leaderboard
router.get(
  '/leaderboard',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('department').optional().isString(),
  ],
  validate,
  analyticsController.getLeaderboard
)

// GET /api/v1/analytics/research-areas - Research area analytics
router.get(
  '/research-areas',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validate,
  analyticsController.getResearchAreas
)

// GET /api/v1/analytics/funding - Funding analytics
router.get(
  '/funding',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validate,
  analyticsController.getFundingAnalytics
)

// GET /api/v1/analytics/status - Acceptance ratio
router.get(
  '/status',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('department').optional().isString(),
  ],
  validate,
  analyticsController.getStatusRatio
)

// GET /api/v1/analytics/export - Export report
router.get('/export', authorize('ADMIN', 'HOD'), analyticsController.exportReport)

export default router
