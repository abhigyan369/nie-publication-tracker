import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { body, param, query } from 'express-validator'
import publicationController from '../controllers/publication.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only PDF files are allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
})

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createPublicationValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 500 })
    .withMessage('Title must be less than 500 characters'),
  body('publicationType')
    .isIn([
      'JOURNAL_ARTICLE',
      'CONFERENCE_PAPER',
      'BOOK',
      'BOOK_CHAPTER',
      'REVIEW_ARTICLE',
      'CASE_STUDY',
      'SHORT_COMMUNICATION',
      'LETTER',
      'EDITORIAL',
    ])
    .withMessage('Invalid publication type'),
  body('abstract')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Abstract must be less than 5000 characters'),
  body('journalName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Journal name is too long'),
  body('conferenceName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Conference name is too long'),
  body('publisher')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Publisher name is too long'),
  body('doi')
    .optional()
    .trim()
    .isURL()
    .withMessage('DOI must be a valid URL'),
  body('publicationDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid publication date'),
  body('status')
    .optional()
    .isIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'PUBLISHED', 'REJECTED']),
  body('quartile')
    .optional()
    .isIn(['Q1', 'Q2', 'Q3', 'Q4']),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  body('researchArea')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  body('fundingAgency')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('fundingAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Funding amount must be a positive number'),
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('coAuthors')
    .optional()
    .isArray()
    .withMessage('Co-authors must be an array'),
]

const updatePublicationValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 500 }),
  body('status')
    .optional()
    .isIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'PUBLISHED', 'REJECTED']),
  body('abstract')
    .optional()
    .trim()
    .isLength({ max: 5000 }),
  body('doi')
    .optional()
    .trim()
    .isURL()
    .withMessage('DOI must be a valid URL'),
]

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'publicationDate', 'title', 'citationCount', 'impactFactor']),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']),
]

// ============================================
// ROUTES
// ============================================

// GET /api/v1/publications - List all publications with filters
router.get(
  '/',
  paginationValidation,
  validate,
  publicationController.getAllPublications
)

// GET /api/v1/publications/stats - Get publication statistics
router.get('/stats', authenticate, publicationController.getStatistics)

// GET /api/v1/publications/:id - Get single publication
router.get(
  '/:id',
  param('id').isString().withMessage('Invalid publication ID'),
  validate,
  publicationController.getPublicationById
)

// POST /api/v1/publications - Create publication
router.post(
  '/',
  authenticate,
  createPublicationValidation,
  validate,
  publicationController.createPublication
)

// PUT /api/v1/publications/:id - Update publication
router.put(
  '/:id',
  authenticate,
  param('id').isString().withMessage('Invalid publication ID'),
  updatePublicationValidation,
  validate,
  publicationController.updatePublication
)

// DELETE /api/v1/publications/:id - Delete publication
router.delete(
  '/:id',
  authenticate,
  param('id').isString().withMessage('Invalid publication ID'),
  validate,
  publicationController.deletePublication
)

// POST /api/v1/publications/:id/files - Upload publication files
router.post(
  '/:id/files',
  authenticate,
  param('id').isString().withMessage('Invalid publication ID'),
  upload.single('file'),
  publicationController.uploadFile
)

// ============================================
// CO-AUTHOR ROUTES
// ============================================

// POST /api/v1/publications/:id/coauthors - Add co-author
router.post(
  '/:id/coauthors',
  authenticate,
  param('id').isString().withMessage('Invalid publication ID'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Co-author name is required'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email address'),
    body('institution')
      .optional()
      .trim()
      .isLength({ max: 200 }),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 }),
  ],
  validate,
  publicationController.addCoAuthor
)

// PUT /api/v1/publications/:id/coauthors/:coauthorId - Update co-author
router.put(
  '/:id/coauthors/:coauthorId',
  authenticate,
  publicationController.updateCoAuthor
)

// DELETE /api/v1/publications/:id/coauthors/:coauthorId - Remove co-author
router.delete(
  '/:id/coauthors/:coauthorId',
  authenticate,
  publicationController.removeCoAuthor
)

export default router
