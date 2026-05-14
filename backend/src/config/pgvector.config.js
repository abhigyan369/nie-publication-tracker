import prisma from './database.config.js'

export async function initializePgvector() {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')
    console.log('✓ pgvector extension enabled')
    await prisma.$executeRawUnsafe('ALTER TABLE "embeddings" ALTER COLUMN embedding TYPE vector(384)')
    console.log('✓ Embeddings column updated to vector(384)')
  } catch (error) {
    console.error('pgvector initialization error:', error.message)
    console.log('Note: Ensure pgvector extension is installed on your PostgreSQL server')
  }
}

export default initializePgvector