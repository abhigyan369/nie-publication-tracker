import { PrismaClient } from '@prisma/client';
import embeddingService from './embeddingService.js';

const prisma = new PrismaClient();

class RetrievalService {
  /**
   * Retrieves the most relevant documents for a given question using semantic search.
   * @param {string} question - The user's natural language query
   * @param {number} limit - Maximum number of results to return (default: 5)
   * @returns {Promise<Array<string>>} Array of relevant context strings
   */
  async retrieveContext(question, limit = 5) {
    if (!question || question.trim() === '') {
      return [];
    }

    try {
      // 1. Generate the embedding vector for the user's question
      const queryEmbedding = await embeddingService.generateEmbedding(question);
      
      // 2. Format the vector array as a string for PostgreSQL
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      // 3. Perform similarity search using cosine distance (<=>)
      // Lower distance means higher similarity.
      const results = await prisma.$queryRaw`
        SELECT content 
        FROM embeddings 
        ORDER BY embedding <=> ${embeddingStr}::vector 
        LIMIT ${limit};
      `;

      // 4. Extract and return just the text content
      return results.map(row => row.content);
      
    } catch (error) {
      console.error('Error during vector retrieval:', error);
      throw new Error('Failed to retrieve context from the database.');
    }
  }
}

export default new RetrievalService();
