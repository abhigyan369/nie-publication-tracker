import workflowService from '../services/workflow.service.js'
import { ApiResponse } from '../utils/response.util.js'

class WorkflowController {
  /**
   * Get pending publications for review
   * GET /api/v1/workflow/pending
   */
  async getPendingPublications(req, res, next) {
    try {
      const { page, limit, search, type, department, sortBy, sortOrder } = req.query

      const result = await workflowService.getPendingPublications({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search,
        type,
        department,
        sortBy,
        sortOrder,
      })

      return ApiResponse.success(res, result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get workflow statistics
   * GET /api/v1/workflow/stats
   */
  async getWorkflowStats(req, res, next) {
    try {
      const stats = await workflowService.getWorkflowStats()

      return ApiResponse.success(res, stats)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get publication status history
   * GET /api/v1/workflow/publications/:id/history
   */
  async getStatusHistory(req, res, next) {
    try {
      const history = await workflowService.getStatusHistory(req.params.id)

      return ApiResponse.success(res, history)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get publication reviews
   * GET /api/v1/workflow/publications/:id/reviews
   */
  async getReviews(req, res, next) {
    try {
      const reviews = await workflowService.getReviews(req.params.id)

      return ApiResponse.success(res, reviews)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Add review comment
   * POST /api/v1/workflow/publications/:id/reviews
   */
  async addReview(req, res, next) {
    try {
      const { comment, isInternal } = req.body
      const review = await workflowService.addReview(req.params.id, comment, isInternal, req.user)

      return ApiResponse.created(res, review, 'Review added successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Approve publication
   * POST /api/v1/workflow/publications/:id/approve
   */
  async approve(req, res, next) {
    try {
      const { comment } = req.body
      const publication = await workflowService.changeStatus(
        req.params.id,
        'ACCEPTED',
        comment,
        req.user
      )

      return ApiResponse.success(res, publication, 'Publication approved successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Reject publication
   * POST /api/v1/workflow/publications/:id/reject
   */
  async reject(req, res, next) {
    try {
      const { comment } = req.body
      const publication = await workflowService.changeStatus(
        req.params.id,
        'REJECTED',
        comment,
        req.user
      )

      return ApiResponse.success(res, publication, 'Publication rejected')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Request revisions
   * POST /api/v1/workflow/publications/:id/revision
   */
  async requestRevision(req, res, next) {
    try {
      const { comment } = req.body
      const publication = await workflowService.changeStatus(
        req.params.id,
        'REVISION_REQUESTED',
        comment,
        req.user
      )

      return ApiResponse.success(res, publication, 'Revision requested')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Mark as under review
   * POST /api/v1/workflow/publications/:id/under-review
   */
  async markUnderReview(req, res, next) {
    try {
      const publication = await workflowService.changeStatus(
        req.params.id,
        'UNDER_REVIEW',
        null,
        req.user
      )

      return ApiResponse.success(res, publication, 'Marked as under review')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Publish publication
   * POST /api/v1/workflow/publications/:id/publish
   */
  async publish(req, res, next) {
    try {
      const { comment } = req.body
      const publication = await workflowService.changeStatus(
        req.params.id,
        'PUBLISHED',
        comment,
        req.user
      )

      return ApiResponse.success(res, publication, 'Publication published')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Submit for review
   * POST /api/v1/workflow/publications/:id/submit
   */
  async submitForReview(req, res, next) {
    try {
      const publication = await workflowService.submitForReview(req.params.id, req.user)

      return ApiResponse.success(res, publication, 'Submitted for review')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Soft delete publication
   * DELETE /api/v1/workflow/publications/:id
   */
  async softDelete(req, res, next) {
    try {
      await workflowService.softDelete(req.params.id, req.user)

      return ApiResponse.success(res, null, 'Publication deleted')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Restore deleted publication
   * POST /api/v1/workflow/publications/:id/restore
   */
  async restore(req, res, next) {
    try {
      const publication = await workflowService.restore(req.params.id, req.user)

      return ApiResponse.success(res, publication, 'Publication restored')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get activity logs
   * GET /api/v1/workflow/activity-logs
   */
  async getActivityLogs(req, res, next) {
    try {
      const { page, limit, action, entityType, entityId, userId } = req.query

      const result = await workflowService.getActivityLogs({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        action,
        entityType,
        entityId,
        userId,
      })

      return ApiResponse.success(res, result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get notifications
   * GET /api/v1/workflow/notifications
   */
  async getNotifications(req, res, next) {
    try {
      const notifications = await workflowService.getNotifications(req.user.id)

      return ApiResponse.success(res, notifications)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get unread notification count
   * GET /api/v1/workflow/notifications/unread-count
   */
  async getUnreadCount(req, res, next) {
    try {
      const count = await workflowService.getUnreadNotificationCount(req.user.id)

      return ApiResponse.success(res, { count })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Mark notification as read
   * POST /api/v1/workflow/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const notification = await workflowService.markNotificationRead(
        req.params.id,
        req.user.id
      )

      return ApiResponse.success(res, notification, 'Notification marked as read')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Mark all notifications as read
   * POST /api/v1/workflow/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      await workflowService.markAllNotificationsRead(req.user.id)

      return ApiResponse.success(res, null, 'All notifications marked as read')
    } catch (error) {
      next(error)
    }
  }
}

export default new WorkflowController()
