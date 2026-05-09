import { body } from 'express-validator'

export const publicationValidation = {
  create: [
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
      .isLength({ max: 5000 })
      .withMessage('Abstract must be less than 5000 characters'),
    body('doi')
      .optional()
      .isURL()
      .withMessage('DOI must be a valid URL'),
  ],
  update: [
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty'),
    body('status')
      .optional()
      .isIn([
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'REVISION_REQUESTED',
        'ACCEPTED',
        'PUBLISHED',
        'REJECTED',
      ])
      .withMessage('Invalid status'),
  ],
}
