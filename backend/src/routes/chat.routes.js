import express from 'express';
import chatController from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);

/**
 * @route GET /api/chat/test-groq
 * @desc Test Groq connectivity without RAG
 * @access Private
 */
router.get('/test-groq', chatController.testGroq);

/**
 * @route GET /api/chat/test-rag
 * @desc Test vector retrieval without Groq
 * @access Private
 */
router.get('/test-rag', chatController.testRag);

/**
 * @route POST /api/chat
 * @desc Generate an AI response based on vector context
 * @access Private
 */
router.post('/', chatController.handleChat);

/**
 * @route POST /api/embeddings/sync
 * @desc Sync all publications to the vector database
 * @access Private (Consider adding requireAdmin middleware here in production)
 */
router.post('/embeddings/sync', chatController.syncEmbeddings);

/**
 * @route GET /api/chat/history
 * @desc Retrieve the user's chat session history
 * @access Private
 */
router.get('/history', chatController.getHistory);

export default router;
