import excelImportService from '../services/excel-import.service.js'
import { ApiResponse } from '../utils/response.util.js'
import logger from '../utils/logger.util.js'
import prisma from '../config/database.config.js'

class ExcelImportController {
  /**
   * Preview import without saving
   * POST /api/v1/import/preview
   */
  async preview(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        })
      }

      const preview = await excelImportService.previewImport(req.file.buffer)

      return ApiResponse.success(res, preview, 'Preview generated successfully')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Execute import
   * POST /api/v1/import/execute
   */
  async execute(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        })
      }

      // Parse and validate first
      const preview = await excelImportService.previewImport(req.file.buffer)

      // Filter only valid records
      const validRecords = preview.validRecords.map(r => {
        const { _rowIndex, _validation, _dbDuplicate, _internalDuplicate, _canImport, ...data } = r
        return data
      })

      if (validRecords.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid records to import',
          preview,
        })
      }

      // Execute import
      const result = await excelImportService.executeImport(validRecords, req.user.id)

      return ApiResponse.success(res, {
        ...result,
        validRecordsCount: preview.validCount,
        invalidRecordsCount: preview.invalidCount,
      }, 'Import completed')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get import template
   * GET /api/v1/import/template
   */
  async getTemplate(req, res, next) {
    try {
      const templateBuffer = excelImportService.generateTemplate()

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename=publication_import_template.xlsx')

      return res.send(templateBuffer)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get import history
   * GET /api/v1/import/history
   */
  async getHistory(req, res, next) {
    try {
      const history = await prisma.activityLog.findMany({
        where: {
          action: 'BULK_IMPORT',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      })

      return ApiResponse.success(res, history)
    } catch (error) {
      next(error)
    }
  }
}

export default new ExcelImportController()
