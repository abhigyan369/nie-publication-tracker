import analyticsService from '../services/analytics.service.js'
import { ApiResponse } from '../utils/response.util.js'

/**
 * Analytics Controller
 *
 * Provides INSTITUTE-WIDE analytics endpoints.
 * All data returned represents all publications in the database,
 * not filtered by the currently logged-in user.
 *
 * Authentication is still required but analytics scope is institution-wide.
 */
class AnalyticsController {
  /**
   * Get dashboard overview - Institute-wide statistics
   * GET /api/v1/analytics/overview
   */
  async getOverview(req, res, next) {
    try {
      const { startDate, endDate, department } = req.query

      const overview = await analyticsService.getDashboardOverview({
        startDate,
        endDate,
        department,
      })

      return ApiResponse.success(res, overview)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get department analytics
   * GET /api/v1/analytics/departments
   */
  async getDepartmentAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query
      const departments = await analyticsService.getDepartmentAnalytics({
        startDate,
        endDate,
      })

      return ApiResponse.success(res, departments)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get monthly trends
   * GET /api/v1/analytics/monthly
   */
  async getMonthlyTrends(req, res, next) {
    try {
      const { startDate, endDate, department } = req.query
      const trends = await analyticsService.getMonthlyTrends({
        startDate,
        endDate,
        department,
      })

      return ApiResponse.success(res, trends)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get yearly trends
   * GET /api/v1/analytics/yearly
   */
  async getYearlyTrends(req, res, next) {
    try {
      const trends = await analyticsService.getYearlyTrends({})

      return ApiResponse.success(res, trends)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get citation analysis
   * GET /api/v1/analytics/citations
   */
  async getCitationAnalysis(req, res, next) {
    try {
      const { startDate, endDate, department } = req.query
      const citations = await analyticsService.getCitationAnalysis({
        startDate,
        endDate,
        department,
      })

      return ApiResponse.success(res, citations)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get faculty leaderboard - Top authors across institute
   * GET /api/v1/analytics/leaderboard
   */
  async getLeaderboard(req, res, next) {
    try {
      const { limit, startDate, endDate, department } = req.query
      const leaderboard = await analyticsService.getFacultyLeaderboard({
        limit: parseInt(limit) || 10,
        startDate,
        endDate,
        department,
      })

      return ApiResponse.success(res, leaderboard)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get research area analytics
   * GET /api/v1/analytics/research-areas
   */
  async getResearchAreas(req, res, next) {
    try {
      const { startDate, endDate } = req.query
      const areas = await analyticsService.getResearchAreaAnalytics({
        startDate,
        endDate,
      })

      return ApiResponse.success(res, areas)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get funding analytics
   * GET /api/v1/analytics/funding
   */
  async getFundingAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query
      const funding = await analyticsService.getFundingAnalytics({
        startDate,
        endDate,
      })

      return ApiResponse.success(res, funding)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get acceptance ratio
   * GET /api/v1/analytics/status
   */
  async getStatusRatio(req, res, next) {
    try {
      const { startDate, endDate, department } = req.query
      const status = await analyticsService.getAcceptanceRatio({
        startDate,
        endDate,
        department,
      })

      return ApiResponse.success(res, status)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Export report
   * GET /api/v1/analytics/export
   */
  async exportReport(req, res, next) {
    try {
      const report = {
        overview: await analyticsService.getDashboardOverview(),
        departments: await analyticsService.getDepartmentAnalytics(),
        yearlyTrends: await analyticsService.getYearlyTrends({}),
        leaderboard: await analyticsService.getFacultyLeaderboard({ limit: 20 }),
        generatedAt: new Date().toISOString(),
      }

      return ApiResponse.success(res, report, 'Report generated successfully')
    } catch (error) {
      next(error)
    }
  }
}

export default new AnalyticsController()
