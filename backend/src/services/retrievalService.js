import { PrismaClient } from '@prisma/client';
import embeddingService from './embeddingService.js';
import logger from '../utils/logger.util.js';

const prisma = new PrismaClient();

function serializeError(error) {
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    errorCode: error.errorCode,
    clientVersion: error.clientVersion,
    stack: error.stack,
  };
}

class RetrievalService {
  /**
   * Retrieves relevant embedding rows with metadata for debugging.
   * @param {string} question
   * @param {number} limit
   * @returns {Promise<Array<Object>>}
   */
  async retrieveDocuments(question, limit = 5) {
    if (!question || question.trim() === '') {
      logger.warn('Vector retrieval skipped: empty question');
      return [];
    }

    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 5;

    try {
      logger.info('Vector retrieval started', {
        questionLength: question.length,
        limit: safeLimit,
      });

      const queryEmbedding = await embeddingService.generateEmbedding(question);
      if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 384) {
        throw new Error(`Invalid query embedding dimensions: ${queryEmbedding?.length ?? 'undefined'}`);
      }

      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      const results = await prisma.$queryRaw`
        SELECT id, "sourceId", "sourceType", content, metadata
        FROM embeddings
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${safeLimit};
      `;

      const documents = Array.isArray(results) ? results : [];
      logger.info('Vector retrieval completed', {
        count: documents.length,
        documents: documents.map((doc) => ({
          id: doc.id,
          sourceId: doc.sourceId,
          sourceType: doc.sourceType,
          contentLength: doc.content?.length ?? 0,
          preview: String(doc.content ?? '').slice(0, 160),
        })),
      });

      return documents;
    } catch (error) {
      logger.error('Vector retrieval failed', {
        questionLength: question?.length ?? 0,
        limit: safeLimit,
        error: serializeError(error),
      });

      const retrievalError = new Error(`Vector retrieval failed: ${error.message}`);
      retrievalError.stage = 'retrieval';
      retrievalError.cause = error;
      retrievalError.details = serializeError(error);
      throw retrievalError;
    }
  }

  /**
   * Retrieves the most relevant documents for a given question using semantic search.
   * @param {string} question - The user's natural language query
   * @param {number} limit - Maximum number of results to return (default: 5)
   * @returns {Promise<Array<string>>} Array of relevant context strings
   */
  async retrieveContext(question, limit = 5) {
    const documents = await this.retrieveDocuments(question, limit);
    return documents.map((row) => row.content).filter(Boolean);
  }
}

export default new RetrievalService();
