import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import dotenv from 'dotenv'

// Route imports
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import publicationRoutes from './routes/publication.routes.js'
import departmentRoutes from './routes/department.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import workflowRoutes from './routes/workflow.routes.js'
import excelImportRoutes from './routes/excel-import.routes.js'
import chatRoutes from './routes/chat.routes.js'

// Middleware imports
import { errorHandler } from './middleware/errorHandler.middleware.js'
import { notFoundHandler } from './middleware/notFound.middleware.js'
import logger from './utils/logger.util.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Rate limiting ────────────────────────────────────────────────────────────
const isDev = (process.env.NODE_ENV || 'development') === 'development'

// Strict limiter for auth endpoints — prevents brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutes
  max: isDev ? 200 : 20,             // lenient in dev, strict in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication requests. Please wait 15 minutes before trying again.' },
  skipSuccessfulRequests: true,       // only count failed requests toward the limit
})

// General API limiter — generous for normal app usage
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) * 60 * 1000 || 15 * 60 * 1000,
  max: isDev ? 2000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})

app.use('/api/v1/auth', authLimiter)
app.use('/api', generalLimiter)

// ============================================
// REQUEST PROCESSING
// ============================================

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Compression
app.use(compression())

// Morgan logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}))

// ============================================
// API ROUTES
// ============================================

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/publications', publicationRoutes)
app.use('/api/v1/departments', departmentRoutes)
app.use('/api/v1/analytics', analyticsRoutes)
app.use('/api/v1/workflow', workflowRoutes)
app.use('/api/v1/import', excelImportRoutes)
app.use('/api/chat', chatRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFoundHandler)
app.use(errorHandler)

// ============================================
// SERVER START
// ============================================

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`)
})

export default app
