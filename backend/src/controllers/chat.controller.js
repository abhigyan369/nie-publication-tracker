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

      if (!message) {
        return res.status(400).json({ success: false, message: 'Message is required' });
      }

      // Generate response using RAG service
      const aiResponse = await ragService.generateResponse(message);

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
      logger.error('Chat Controller Error:', error);
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
