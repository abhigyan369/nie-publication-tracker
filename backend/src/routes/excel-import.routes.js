import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import excelImportController from '../controllers/excel-import.controller.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// ============================================
// MULTER FILE UPLOAD CONFIG
// ============================================

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]

  if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
    cb(null, true)
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// ============================================
// ROUTES
// ============================================

// All routes require authentication
router.use(authenticate)

// POST /api/v1/import/preview - Preview import without saving
router.post(
  '/preview',
  upload.single('file'),
  excelImportController.preview
)

// POST /api/v1/import/execute - Execute import
router.post(
  '/execute',
  upload.single('file'),
  excelImportController.execute
)

// GET /api/v1/import/template - Download import template
router.get(
  '/template',
  excelImportController.getTemplate
)

// GET /api/v1/import/history - Get import history
router.get(
  '/history',
  authorize('ADMIN', 'HOD'),
  excelImportController.getHistory
)

export default router
