-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Update embeddings table to use vector type
ALTER TABLE "embeddings" ALTER COLUMN embedding TYPE vector(384);