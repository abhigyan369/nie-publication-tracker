import { validationResult } from 'express-validator'
import { ApiError } from '../utils/response.util.js'

/**
 * Validation Middleware
 * Handles express-validator validation results
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }))

    throw ApiError.validationError(formattedErrors)
  }

  next()
}
