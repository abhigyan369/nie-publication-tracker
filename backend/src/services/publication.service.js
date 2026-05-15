import prisma from '../config/database.config.js'
import { ApiError } from '../utils/response.util.js'
import logger from '../utils/logger.util.js'
import embeddingService from './embeddingService.js'

class PublicationService {
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
   * Get all publications with filtering, search, pagination, and sorting
   */
  async getAllPublications(filters) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      type,
      authorId,
      department,
      researchArea,
      startDate,
      endDate,
      quartile,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters

    const skip = (page - 1) * limit
    const where = { isDeleted: false }

    // Search filter — matches across multiple text fields and keyword array
    if (search) {
      const terms = search.trim().split(/\s+/).filter(Boolean)
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { abstract: { contains: search, mode: 'insensitive' } },
        { journalName: { contains: search, mode: 'insensitive' } },
        { conferenceName: { contains: search, mode: 'insensitive' } },
        { doi: { contains: search, mode: 'insensitive' } },
        // hasSome expects a flat string array, not a nested array
        { keywords: { hasSome: terms } },
      ]
    }

    // Status filter
    if (status) {
      where.status = status
    }

    // Type filter
    if (type) {
      where.publicationType = type
    }

    // Author filter
    if (authorId) {
      where.authorId = authorId
    }

    // Department filter
    if (department) {
      where.department = { contains: department, mode: 'insensitive' }
    }

    // Research area filter
    if (researchArea) {
      where.researchArea = { contains: researchArea, mode: 'insensitive' }
    }

    // Quartile filter
    if (quartile) {
      where.quartile = quartile
    }

    // Date range filter
    if (startDate || endDate) {
      where.publicationDate = {}
      if (startDate) where.publicationDate.gte = new Date(startDate)
      if (endDate) where.publicationDate.lte = new Date(endDate)
    }

    // Validate sort field
    const allowedSortFields = ['createdAt', 'updatedAt', 'publicationDate', 'title', 'citationCount', 'impactFactor']
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const orderByDirection = sortOrder === 'asc' ? 'asc' : 'desc'

    const [publications, total] = await Promise.all([
      prisma.publication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderByDirection },
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
          coAuthors: {
            orderBy: { orderIndex: 'asc' },
          },
          _count: {
            select: { metrics: true },
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
   * Get lightweight autocomplete suggestions for a search query.
   * Returns up to 8 matching publication titles + author info.
   */
  async getSearchSuggestions(query, limit = 8) {
    if (!query || query.trim().length < 2) return []

    const q = query.trim()
    const terms = q.split(/\s+/).filter(Boolean)

    const publications = await prisma.publication.findMany({
      where: {
        isDeleted: false,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { journalName: { contains: q, mode: 'insensitive' } },
          { conferenceName: { contains: q, mode: 'insensitive' } },
          { keywords: { hasSome: terms } },
          {
            author: {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        publicationType: true,
        status: true,
        author: {
          select: { firstName: true, lastName: true },
        },
      },
      take: limit,
      orderBy: { title: 'asc' },
    })

    return publications
  }

  /**
   * Get single publication by ID
   */
  async getPublicationById(publicationId) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            designation: true,
          },
        },
        coAuthors: {
          orderBy: { orderIndex: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        metrics: {
          orderBy: { recordedAt: 'desc' },
        },
      },
    })

    if (!publication) {
      throw ApiError.notFound('Publication not found')
    }

    return publication
  }

  /**
   * Create new publication
   */
  async createPublication(data, user) {
    const {
      coAuthors,
      metrics,
      ...publicationData
    } = data

    // Faculty can only create their own publications
    if (user.role === 'FACULTY' && publicationData.authorId && publicationData.authorId !== user.id) {
      throw ApiError.forbidden('You can only create publications for yourself')
    }

    // Use provided authorId or current user
    const authorId = publicationData.authorId || user.id

    // Check for duplicate DOI
    if (publicationData.doi) {
      const existingDoi = await prisma.publication.findUnique({
        where: { doi: publicationData.doi },
      })
      if (existingDoi) {
        throw ApiError.conflict('A publication with this DOI already exists')
      }
    }

    const publication = await prisma.publication.create({
      data: {
        ...publicationData,
        authorId,
        coAuthors: coAuthors ? {
          create: coAuthors.map((author, index) => ({
            name: author.name,
            email: author.email,
            institution: author.institution,
            department: author.department,
            orderIndex: author.orderIndex ?? index,
            isCorresponding: author.isCorresponding || false,
            userId: author.userId,
          })),
        } : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        coAuthors: true,
      },
    })

    // Log activity
    await this.logActivity(user.id, 'CREATE', 'Publication', publication.id, { title: publication.title })
    await this.syncPublicationEmbeddingSafely(publication.id, 'created')

    logger.info(`Publication created: ${publication.id} by user ${user.id}`)

    return publication
  }

  /**
   * Update publication
   */
  async updatePublication(publicationId, data, user) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    })

    if (!publication) {
      throw ApiError.notFound('Publication not found')
    }

    // Only author or admin can update
    if (publication.authorId !== user.id && user.role !== 'ADMIN' && user.role !== 'HOD') {
      throw ApiError.forbidden('You can only update your own publications')
    }

    // Check for duplicate DOI
    if (data.doi && data.doi !== publication.doi) {
      const existingDoi = await prisma.publication.findUnique({
        where: { doi: data.doi },
      })
      if (existingDoi) {
        throw ApiError.conflict('A publication with this DOI already exists')
      }
    }

    const { coAuthors, ...updateData } = data

    const updated = await prisma.publication.update({
      where: { id: publicationId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        coAuthors: true,
      },
    })

    await this.logActivity(user.id, 'UPDATE', 'Publication', publicationId, { title: updated.title })
    await this.syncPublicationEmbeddingSafely(publicationId, 'updated')

    return updated
  }

  /**
   * Delete publication
   */
  async deletePublication(publicationId, user) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    })

    if (!publication) {
      throw ApiError.notFound('Publication not found')
    }

    if (publication.authorId !== user.id && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only delete your own publications')
    }

    await prisma.publication.delete({
      where: { id: publicationId },
    })

    await this.logActivity(user.id, 'DELETE', 'Publication', publicationId, { title: publication.title })
    await this.deletePublicationEmbeddingSafely(publicationId)

    logger.info(`Publication deleted: ${publicationId} by user ${user.id}`)
  }

  /**
   * Add co-author to publication
   */
  async addCoAuthor(publicationId, coAuthorData, user) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    })

    if (!publication) {
      throw ApiError.notFound('Publication not found')
    }

    if (publication.authorId !== user.id && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only add co-authors to your own publications')
    }

    // Get the next order index
    const lastCoAuthor = await prisma.coAuthor.findFirst({
      where: { publicationId },
      orderBy: { orderIndex: 'desc' },
    })

    const coAuthor = await prisma.coAuthor.create({
      data: {
        ...coAuthorData,
        publicationId,
        orderIndex: coAuthorData.orderIndex ?? (lastCoAuthor ? lastCoAuthor.orderIndex + 1 : 0),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    await this.logActivity(user.id, 'ADD_COAUTHOR', 'Publication', publicationId, {
      coAuthorName: coAuthor.name,
    })
    await this.syncPublicationEmbeddingSafely(publicationId, 'updated after co-author add')

    return coAuthor
  }

  /**
   * Update co-author
   */
  async updateCoAuthor(publicationId, coauthorId, data, user) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    })

    if (!publication) {
      throw ApiError.notFound('Publication not found')
    }

    if (publication.authorId !== user.id && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only modify co-authors of your own publications')
    }

    const coAuthor = await prisma.coAuthor.update({
      where: { id: coauthorId, publicationId },
      data,
    })

    await this.syncPublicationEmbeddingSafely(publicationId, 'updated after co-author update')

    return coAuthor
  }

  /**
   * Remove co-author
   */
  async removeCoAuthor(publicationId, coauthorId, user) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    })

    if (!publication) {
      throw ApiError.notFound('Publication not found')
    }

    if (publication.authorId !== user.id && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only remove co-authors from your own publications')
    }

    await prisma.coAuthor.delete({
      where: { id: coauthorId, publicationId },
    })

    await this.logActivity(user.id, 'REMOVE_COAUTHOR', 'Publication', publicationId, {
      coauthorId,
    })
    await this.syncPublicationEmbeddingSafely(publicationId, 'updated after co-author removal')
  }

  /**
   * Upload publication files
   */
  async uploadFile(publicationId, fileType, fileUrl, user) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
    })

    if (!publication) {
      throw ApiError.notFound('Publication not found')
    }

    if (publication.authorId !== user.id && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only upload files to your own publications')
    }

    const updateData = {}
    switch (fileType) {
      case 'paper':
        updateData.paperUrl = fileUrl
        break
      case 'certificate':
        updateData.certificateUrl = fileUrl
        break
      case 'supplementary':
        updateData.supplementaryFileUrl = fileUrl
        break
      default:
        throw ApiError.badRequest('Invalid file type')
    }

    const updated = await prisma.publication.update({
      where: { id: publicationId },
      data: updateData,
    })

    await this.logActivity(user.id, 'UPLOAD_FILE', 'Publication', publicationId, {
      fileType,
    })
    await this.syncPublicationEmbeddingSafely(publicationId, 'updated after file upload')

    return updated
  }

  /**
   * Get publication statistics
   */
  async getStatistics(userId = null) {
    const where = userId ? { authorId: userId } : {}

    const [
      totalPublications,
      publishedCount,
      draftCount,
      pendingCount,
      totalCitations,
      avgImpactFactor,
    ] = await Promise.all([
      prisma.publication.count({ where }),
      prisma.publication.count({ where: { ...where, status: 'PUBLISHED' } }),
      prisma.publication.count({ where: { ...where, status: 'DRAFT' } }),
      prisma.publication.count({ where: { ...where, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.publication.aggregate({ where, _sum: { citationCount: true } }),
      prisma.publication.aggregate({
        where: { ...where, impactFactor: { not: null } },
        _avg: { impactFactor: true },
      }),
    ])

    return {
      totalPublications,
      publishedCount,
      draftCount,
      pendingCount,
      totalCitations: totalCitations._sum.citationCount || 0,
      avgImpactFactor: avgImpactFactor._avg.impactFactor || 0,
    }
  }

  /**
   * Helper: Log activity
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

export default new PublicationService()
