import { pipeline, env } from '@xenova/transformers';
import { PrismaClient } from '@prisma/client';
import documentFormatter from './documentFormatter.js';
import crypto from 'crypto';

// Disable local cache warnings for transformers if needed
env.allowLocalModels = false;
env.useBrowserCache = false;

const prisma = new PrismaClient();

class EmbeddingService {
  constructor() {
    this.extractor = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
  }

  async getExtractor() {
    if (!this.extractor) {
      console.log('Loading embedding model... (this may take a moment on first run)');
      this.extractor = await pipeline('feature-extraction', this.modelName, {
        quantized: false, 
      });
      console.log('Embedding model loaded successfully.');
    }
    return this.extractor;
  }

  /**
   * Generates a 384-dimensional vector for a given text.
   * @param {string} text
   * @returns {Promise<number[]>} Array of numbers representing the embedding
   */
  async generateEmbedding(text) {
    const extractor = await this.getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  /**
   * Stores or updates an embedding in the pgvector database.
   * @param {string} sourceId - ID of the source record (e.g. publication.id)
   * @param {string} sourceType - Type of source ('PUBLICATION', 'USER')
   * @param {string} content - The formatted text content
   * @param {number[]} embedding - The 384D vector array
   */
  async storeEmbedding(sourceId, sourceType, content, embedding) {
    // Format the vector array as a string like "[0.1, 0.2, ...]" for pgvector
    const embeddingStr = `[${embedding.join(',')}]`;

    // Remove old embedding if exists
    await prisma.$executeRaw`
      DELETE FROM embeddings 
      WHERE "sourceId" = ${sourceId} AND "sourceType" = ${sourceType};
    `;

    // Generate ID for the row
    const id = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO embeddings (id, "sourceId", "sourceType", content, embedding, "updatedAt")
      VALUES (
        ${id}, 
        ${sourceId}, 
        ${sourceType}, 
        ${content}, 
        ${embeddingStr}::vector, 
        NOW()
      );
    `;
  }

  /**
   * Synchronizes all publication records into embeddings.
   */
  async syncEmbeddings() {
    console.log('Starting embedding synchronization...');
    
    const publications = await prisma.publication.findMany({
      where: { isDeleted: false },
      include: {
        author: true,
        coAuthors: true,
      }
    });

    console.log(`Found ${publications.length} publications to sync.`);

    let successCount = 0;
    for (const pub of publications) {
      try {
        const content = documentFormatter.formatPublication(pub);
        if (!content) continue;

        const vector = await this.generateEmbedding(content);
        await this.storeEmbedding(pub.id, 'PUBLICATION', content, vector);
        
        successCount++;
        console.log(`Synced embedding for publication: ${pub.id}`);
      } catch (error) {
        console.error(`Failed to sync publication ${pub.id}:`, error);
      }
    }

    console.log(`Synchronization complete! Successfully synced ${successCount}/${publications.length} records.`);
    return { successCount, total: publications.length };
  }
}

export default new EmbeddingService();
