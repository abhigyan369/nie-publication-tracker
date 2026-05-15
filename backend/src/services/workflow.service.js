import prisma from '../config/database.config.js'
import { ApiError } from '../utils/response.util.js'
import logger from '../utils/logger.util.js'
import embeddingService from './embeddingService.js'

/**
 * Valid status transitions and who can perform them
 */
const STATUS_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED', 'REVISION_REQUESTED'],
  UNDER_REVIEW: ['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED'],
  REVISION_REQUESTED: ['SUBMITTED'],
  ACCEPTED: ['PUBLISHED', 'REJECTED'],
  PUBLISHED: [],
  REJECTED: [],
}

class WorkflowService {
  async syncPublicationEmbeddingSafely(publicationId, action) {
    try {
      await embeddingService.syncPublicationEmbedding(publicationId)
      logger.info(`Publication embedding ${action}: ${publicationId}`)
    } catch (error) {
      logger.error(`Failed to ${action} publication embedding ${publicationId}:`, error)
    }
  }

  async deletePublicationEmbeddingSafely(publicationId) {
    try {
      await embeddingService.deleteEmbedding(publicationId, 'PUBLICATION')
      logger.info(`Publication embedding deleted: ${publicationId}`)
    } catch (error) {
      logger.error(`Failed to delete publication embedding ${publicationId}:`, error)
    }
  }

  /**
   * Get pending publications for review
   */
  async getPendingPublications(filters = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      department,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters

    const skip = (page - 1) * limit
    const where = {
      isDeleted: false,
      status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { journalName: { contains: search, mode: 'insensitive' } },
        { author: { firstName: { contains: search, mode: 'insensitive' } } },
        { author: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (type) {
      where.publicationType = type
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' }
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'publicationDate']
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'

    const [publications, total] = await Promise.all([
      prisma.publication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
            },
          },
          coAuthors: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              reviewedBy: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      prisma.publication.count({ where }),
    ])

    return {
      publications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats() {
    const [
      pendingReview,
      underReview,
      revisionRequested,
      approvedThisMonth,
      rejectedThisMonth,
      avgReviewTime,
    ] = await Promise.all([
      prisma.publication.count({
        where: { status: 'SUBMITTED', isDeleted: false },
      }),
      prisma.publication.count({
        where: { status: 'UNDER_REVIEW', isDeleted: false },
      }),
      prisma.publication.count({
        where: { status: 'REVISION_REQUESTED', isDeleted: false },
      }),
      prisma.publication.count({
        where: {
          status: { in: ['ACCEPTED', 'PUBLISHED'] },
          isDeleted: false,
          updatedAt: { gte: new Date(new Date().setDate(1)) },
        },
      }),
      prisma.publication.count({
        where: {
          status: 'REJECTED',
          isDeleted: false,
          updatedAt: { gte: new Date(new Date().setDate(1)) },
        },
      }),
      this.getAverageReviewTime(),
    ])

    return {
      pendingReview,
      underReview,
      revisionRequested,
      approvedThisMonth,
      rejectedThisMonth,
      avgReviewTime,
    }
  }

  /**
   * Calculate average review time
   */
  async getAverageReviewTime() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const transitions = await prisma.statusTransition.findMany({
      where: {
        toStatus: { in: ['ACCEPTED', 'REJECTED'] },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    if (transitions.length === 0) return 0

    const publicationsWithSubmissions = await prisma.publication.findMany({
      where: {
        statusHistory: {
          some: {
            toStatus: { in: ['ACCEPTED', 'REJECTED'] },
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      },
      select: { createdAt: true, statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })

    let totalDays = 0
    let count = 0

    for (const pub of publicationsWithSubmissions) {
      const submissionDate = new Date(pub.createdAt)
      const resolutionDate = new Date(pub.statusHistory[0]?.createdAt)

      if (submissionDate && resolutionDate) {
        const days = Math.ceil((resolutionDate - submissionDate) / (1000 * 60 * 60 * 24))
        totalDays += days
        count++
      }
    }

    return count > 0 ? Math.round(totalDays / count) : 0
  }

  /**
   * Change publication status with validation
   */
  async changeStatus(publicationId, newStatus, comment, user, attachmentsUrl = null) {
    const updatedPublication = await prisma.$transaction(async (tx) => {
      // Get current publication
      const publication = await tx.publication.findUnique({
        where: { id: publicationId },
        include: { statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 } },
      })

      if (!publication) {
        throw ApiError.notFound('Publication not found')
      }

      if (publication.isDeleted) {
        throw ApiError.badRequest('Cannot modify a deleted publication')
      }

      const currentStatus = publication.status

      // Validate transition
      const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || []
      if (!allowedTransitions.includes(newStatus)) {
        throw ApiError.badRequest(
          `Invalid status transition from ${currentStatus} to ${newStatus}`
        )
      }

      // Only admins and HODs can approve/reject
      if (['ACCEPTED', 'REJECTED', 'UNDER_REVIEW'].includes(newStatus)) {
        if (!['ADMIN', 'HOD', 'REVIEWER'].includes(user.role)) {
          throw ApiError.forbidden('You do not have permission to perform this action')
        }
      }

      // Update publication status
      const updateData = {
        status: newStatus,
        updatedAt: new Date(),
      }

      // Set dates based on new status
      if (newStatus === 'ACCEPTED') {
        updateData.acceptedDate = new Date()
      } else if (newStatus === 'PUBLISHED') {
        updateData.publishedDate = new Date()
      }

      // Create status transition record
      await tx.statusTransition.create({
        data: {
          publicationId,
          fromStatus: currentStatus,
          toStatus: newStatus,
          comment,
          attachmentsUrl,
          reviewedById: user.id,
        },
      })

      // Update publication
      const updatedPublication = await tx.publication.update({
        where: { id: publicationId },
        data: updateData,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      })

      // Create notification for author
      await tx.notification.create({
        data: {
          userId: publication.authorId,
          title: this.getNotificationTitle(newStatus),
          message: this.getNotificationMessage(newStatus, publication.title, comment),
          type: this.getNotificationType(newStatus),
          link: `/publications/${publicationId}`,
          metadata: {
            publicationId,
            previousStatus: currentStatus,
            newStatus,
            reviewerId: user.id,
          },
        },
      })

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'STATUS_CHANGE',
          entityType: 'Publication',
          entityId: publicationId,
          details: {
            fromStatus: currentStatus,
            toStatus: newStatus,
            comment,
          },
        },
      })

      logger.info(
        `Publication ${publicationId} status changed from ${currentStatus} to ${newStatus} by user ${user.id}`
      )

      return updatedPublication
    })

    await this.syncPublicationEmbeddingSafely(publicationId, 'updated after status change')

    return updatedPublication
  }

  /**
   * Submit publication for review
   */
  async submitForReview(publicationId, user) {
    const updated = await prisma.$transaction(async (tx) => {
      const publication = await tx.publication.findUnique({
        where: { id: publicationId },
      })

      if (!publication) {
        throw ApiError.notFound('Publication not found')
      }

      if (publication.authorId !== user.id && user.role !== 'ADMIN') {
        throw ApiError.forbidden('You can only submit your own publications')
      }

      if (publication.status !== 'DRAFT' && publication.status !== 'REVISION_REQUESTED') {
        throw ApiError.badRequest('Only draft or revision-requested publications can be submitted')
      }

      const previousStatus = publication.status

      await tx.statusTransition.create({
        data: {
          publicationId,
          fromStatus: previousStatus,
          toStatus: 'SUBMITTED',
          reviewedById: user.id,
        },
      })

      const updated = await tx.publication.update({
        where: { id: publicationId },
        data: { status: 'SUBMITTED' },
      })

      // Notify admins
      const admins = await tx.user.findMany({
        where: { role: { in: ['ADMIN', 'HOD'] } },
        select: { id: true },
      })

      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'New Publication Submitted',
          message: `"${publication.title}" has been submitted for review`,
          type: 'PUBLICATION_SUBMITTED',
          link: `/admin/workflow/${publicationId}`,
          metadata: { publicationId },
        })),
      })

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'SUBMIT_FOR_REVIEW',
          entityType: 'Publication',
          entityId: publicationId,
          details: { title: publication.title },
        },
      })

      return updated
    })

    await this.syncPublicationEmbeddingSafely(publicationId, 'updated after review submission')

    return updated
  }

  /**
   * Soft delete publication
   */
  async softDelete(publicationId, user) {
    const updated = await prisma.$transaction(async (tx) => {
      const publication = await tx.publication.findUnique({
        where: { id: publicationId },
      })

      if (!publication) {
        throw ApiError.notFound('Publication not found')
      }

      if (publication.authorId !== user.id && user.role !== 'ADMIN') {
        throw ApiError.forbidden('You can only delete your own publications')
      }

      if (publication.isDeleted) {
        throw ApiError.badRequest('Publication is already deleted')
      }

      const updated = await tx.publication.update({
        where: { id: publicationId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: user.id,
        },
      })

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'SOFT_DELETE',
          entityType: 'Publication',
          entityId: publicationId,
          details: { title: publication.title },
        },
      })

      return updated
    })

    await this.deletePublicationEmbeddingSafely(publicationId)

    return updated
  }

  /**
   * Restore deleted publication
   */
  async restore(publicationId, user) {
    if (user.role !== 'ADMIN') {
      throw ApiError.forbidden('Only admins can restore publications')
    }

    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    })

    if (!publication) {
      throw ApiError.notFound('Publication not found')
    }

    if (!publication.isDeleted) {
      throw ApiError.badRequest('Publication is not deleted')
    }

    const updated = await prisma.publication.update({
      where: { id: publicationId },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        status: 'DRAFT',
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'RESTORE',
        entityType: 'Publication',
        entityId: publicationId,
        details: { title: publication.title },
      },
    })

    await this.syncPublicationEmbeddingSafely(publicationId, 'restored')

    return updated
  }

  /**
   * Get publication status history
   */
  async getStatusHistory(publicationId) {
    const history = await prisma.statusTransition.findMany({
      where: { publicationId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    })

    return history
  }

  /**
   * Add review comment
   */
  async addReview(publicationId, comment, isInternal, user) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    })

    if (!publication) {
      throw ApiError.notFound('Publication not found')
    }

    const review = await prisma.review.create({
      data: {
        publicationId,
        reviewerId: user.id,
        status: 'PENDING',
        comment,
        isInternal,
      },
      include: {
        reviewer: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
    })

    // Notify author
    if (!isInternal) {
      await prisma.notification.create({
        data: {
          userId: publication.authorId,
          title: 'New Comment',
          message: `${user.firstName} added a comment on "${publication.title}"`,
          type: 'COMMENT_ADDED',
          link: `/publications/${publicationId}`,
        },
      })
    }

    return review
  }

  /**
   * Get publication reviews
   */
  async getReviews(publicationId) {
    return prisma.review.findMany({
      where: { publicationId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    })
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(filters = {}) {
    const { page = 1, limit = 20, action, entityType, entityId, userId } = filters
    const skip = (page - 1) * limit
    const where = {}

    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (userId) where.userId = userId

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ])

    return { logs, total }
  }

  /**
   * Get notifications for user
   */
  async getNotifications(userId, unreadOnly = false) {
    const where = { userId }
    if (unreadOnly) {
      where.isRead = false
    }

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId, userId) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      throw ApiError.notFound('Notification not found')
    }

    if (notification.userId !== userId) {
      throw ApiError.forbidden('You do not have permission to access this notification')
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    })
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(userId) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    })
  }

  // Helper methods
  getNotificationTitle(status) {
    const titles = {
      SUBMITTED: 'Publication Submitted',
      UNDER_REVIEW: 'Under Review',
      REVISION_REQUESTED: 'Revision Requested',
      ACCEPTED: 'Publication Accepted',
      REJECTED: 'Publication Rejected',
      PUBLISHED: 'Publication Published',
    }
    return titles[status] || 'Status Update'
  }

  getNotificationMessage(status, title, comment) {
    const messages = {
      SUBMITTED: `"${title}" is now under review`,
      UNDER_REVIEW: `"${title}" is now under review`,
      REVISION_REQUESTED: `Revision requested for "${title}"${comment ? `: "${comment}"` : ''}`,
      ACCEPTED: `"${title}" has been accepted${comment ? `: "${comment}"` : ''}`,
      REJECTED: `"${title}" has been rejected${comment ? `: "${comment}"` : ''}`,
      PUBLISHED: `"${title}" has been published`,
    }
    return messages[status] || 'Your publication status has been updated'
  }

  getNotificationType(status) {
    const types = {
      SUBMITTED: 'PUBLICATION_SUBMITTED',
      UNDER_REVIEW: 'PUBLICATION_SUBMITTED',
      REVISION_REQUESTED: 'REVISION_REQUESTED',
      ACCEPTED: 'PUBLICATION_APPROVED',
      REJECTED: 'PUBLICATION_REJECTED',
      PUBLISHED: 'PUBLICATION_PUBLISHED',
    }
    return types[status] || 'SYSTEM_ANNOUNCEMENT'
  }
}

export default new WorkflowService()
