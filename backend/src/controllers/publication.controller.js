import publicationService from '../services/publication.service.js'
import { ApiResponse } from '../utils/response.util.js'
import logger from '../utils/logger.util.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class PublicationController {
  /**
   * Get all publications with filtering, search, pagination
   * GET /api/v1/publications
   */
  async getAllPublications(req, res, next) {
    try {
      const {
        page,
        limit,
        search,
        status,
        type,
        authorId,
        department,
        researchArea,
        startDate,
        endDate,
        quartile,
        sortBy,
        sortOrder,
      } = req.query

      const result = await publicationService.getAllPublications({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search,
        status,
        type,
        authorId,
        department,
        researchArea,
        startDate,
        endDate,
        quartile,
        sortBy,
        sortOrder,
      })

      return ApiResponse.success(res, result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get publication statistics
   * GET /api/v1/publications/stats
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await publicationService.getStatistics(req.user.id)

      return ApiResponse.success(res, stats)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get single publication
   * GET /api/v1/publications/:id
   */
  async getPublicationById(req, res, next) {
    try {
      const publication = await publicationService.getPublicationById(req.params.id)

      return ApiResponse.success(res, publication)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Create new publication
   * POST /api/v1/publications
   */
  async createPublication(req, res, next) {
    try {
      const publication = await publicationService.createPublication(req.body, req.user)

      return ApiResponse.created(res, publication, 'Publication created successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update publication
   * PUT /api/v1/publications/:id
   */
  async updatePublication(req, res, next) {
    try {
      const publication = await publicationService.updatePublication(
        req.params.id,
        req.body,
        req.user
      )

      return ApiResponse.success(res, publication, 'Publication updated successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Delete publication
   * DELETE /api/v1/publications/:id
   */
  async deletePublication(req, res, next) {
    try {
      await publicationService.deletePublication(req.params.id, req.user)

      return ApiResponse.success(res, null, 'Publication deleted successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Upload publication files
   * POST /api/v1/publications/:id/files
   */
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        })
      }

      const fileType = req.body.fileType || 'paper'
      const fileUrl = `/uploads/${req.file.filename}`

      const publication = await publicationService.uploadFile(
        req.params.id,
        fileType,
        fileUrl,
        req.user
      )

      return ApiResponse.success(res, {
        publication,
        file: {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          type: fileType,
        },
      }, 'File uploaded successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Add co-author
   * POST /api/v1/publications/:id/coauthors
   */
  async addCoAuthor(req, res, next) {
    try {
      const coAuthor = await publicationService.addCoAuthor(
        req.params.id,
        req.body,
        req.user
      )

      return ApiResponse.created(res, coAuthor, 'Co-author added successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update co-author
   * PUT /api/v1/publications/:id/coauthors/:coauthorId
   */
  async updateCoAuthor(req, res, next) {
    try {
      const coAuthor = await publicationService.updateCoAuthor(
        req.params.id,
        req.params.coauthorId,
        req.body,
        req.user
      )

      return ApiResponse.success(res, coAuthor, 'Co-author updated successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Remove co-author
   * DELETE /api/v1/publications/:id/coauthors/:coauthorId
   */
  async removeCoAuthor(req, res, next) {
    try {
      await publicationService.removeCoAuthor(
        req.params.id,
        req.params.coauthorId,
        req.user
      )

      return ApiResponse.success(res, null, 'Co-author removed successfully')
    } catch (error) {
      next(error)
    }
  }
}

export default new PublicationController()
