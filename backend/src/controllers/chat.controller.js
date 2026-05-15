import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/response.util.js';
import logger from '../utils/logger.util.js';
import ragService from '../services/ragService.js';
import embeddingService from '../services/embeddingService.js';

const prisma = new PrismaClient();

class ChatController {
  /**
   * Handle user chat queries
   * POST /api/chat
   */
  async handleChat(req, res, next) {
    try {
      const { message, sessionId } = req.body;
      const userId = req.user.id;

      logger.info('Incoming chat request', {
        userId,
        hasMessage: typeof message === 'string' && message.trim().length > 0,
        messageLength: typeof message === 'string' ? message.length : 0,
        messagePreview: typeof message === 'string' ? message.slice(0, 250) : null,
        sessionId: sessionId || null,
        bodyKeys: Object.keys(req.body || {}),
      });

      if (!message) {
        return res.status(400).json({ success: false, message: 'Message is required' });
      }

      // Generate response using RAG service
      const aiResponse = await ragService.generateResponse(message);
      logger.info('Chat RAG response generated', {
        userId,
        sessionId: sessionId || null,
        answerLength: aiResponse?.answer?.length ?? 0,
        retrievedContextCount: aiResponse?.retrievedContexts?.length ?? 0,
      });

      // Handle session & history persistence
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        // Create new session if none provided
        const newSession = await prisma.chatSession.create({
          data: {
            userId,
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          }
        });
        currentSessionId = newSession.id;
      }

      // Save user message
      await prisma.chatMessage.create({
        data: {
          sessionId: currentSessionId,
          role: 'USER',
          content: message,
        }
      });

      // Save assistant message
      await prisma.chatMessage.create({
        data: {
          sessionId: currentSessionId,
          role: 'ASSISTANT',
          content: aiResponse.answer,
          metadata: { retrievedContexts: aiResponse.retrievedContexts }
        }
      });

      return ApiResponse.success(res, {
        sessionId: currentSessionId,
        answer: aiResponse.answer,
        retrievedContexts: aiResponse.retrievedContexts
      }, 'Chat response generated successfully');

    } catch (error) {
      logger.error('Chat Controller Error', {
        message: error.message,
        stage: error.stage,
        stack: error.stack,
        details: error.details,
      });
      next(error);
    }
  }

  /**
   * Test Groq without the RAG pipeline.
   * GET /api/chat/test-groq
   */
  async testGroq(req, res, next) {
    try {
      const response = await ragService.testGroq();
      return ApiResponse.success(res, response, 'Groq test completed successfully');
    } catch (error) {
      logger.error('Groq test route failed', {
        message: error.message,
        stack: error.stack,
        details: error.details,
      });
      next(error);
    }
  }

  /**
   * Test vector retrieval without calling Groq.
   * GET /api/chat/test-rag?q=...
   */
  async testRag(req, res, next) {
    try {
      const question = req.query.q || 'Show publication statistics';
      const retrievalService = (await import('../services/retrievalService.js')).default;
      const documents = await retrievalService.retrieveDocuments(question, 5);

      return ApiResponse.success(res, {
        question,
        count: documents.length,
        documents: documents.map((doc) => ({
          id: doc.id,
          sourceId: doc.sourceId,
          sourceType: doc.sourceType,
          contentLength: doc.content?.length ?? 0,
          contentPreview: String(doc.content ?? '').slice(0, 500),
          metadata: doc.metadata ?? null,
        })),
      }, 'RAG retrieval test completed successfully');
    } catch (error) {
      logger.error('RAG retrieval test route failed', {
        message: error.message,
        stage: error.stage,
        stack: error.stack,
        details: error.details,
      });
      next(error);
    }
  }

  /**
   * Sync all embeddings
   * POST /api/embeddings/sync
   */
  async syncEmbeddings(req, res, next) {
    try {
      // In production, you might want to restrict this to ADMIN only
      const result = await embeddingService.syncEmbeddings();
      
      return ApiResponse.success(res, result, 'Embeddings synchronized successfully');
    } catch (error) {
      logger.error('Sync Embeddings Error:', error);
      next(error);
    }
  }

  /**
   * Get user chat history
   * GET /api/chat/history
   */
  async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      
      const sessions = await prisma.chatSession.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      return ApiResponse.success(res, sessions, 'Chat history retrieved successfully');
    } catch (error) {
      logger.error('Get Chat History Error:', error);
      next(error);
    }
  }
}

export default new ChatController();
