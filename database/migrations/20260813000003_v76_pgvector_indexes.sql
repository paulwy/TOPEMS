-- V76: Add pgvector HNSW indexes to AI knowledge base vector columns
-- Affected tables (plugin_ai schema — managed by Phase 1 database migrations):
--   1. plugin_ai.document_chunks.embedding  — primary table queried by vector.rs search_similar()
--   2. plugin_ai.document_embeddings.embedding — legacy standalone vector store
-- Notes:
--   - HNSW: build slightly slower (~5min per 10k rows) than IVFFlat, but O(log N) query
--     performance and no training data required
--   - m=16 edges per node (pgvector default), ef_construction=200 for high-quality build
--   - All statements wrapped in DO blocks for idempotent re-execution safety

-- 1. Ensure pgvector extension is enabled (required before any vector index)
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. plugin_ai.document_chunks.embedding
--    This is the table that svc/ai/src/services/vector.rs search_similar()
--    queries directly with `c.embedding <=> $1::vector` (cosine distance).
--    Missing index → every vector search is a full-table scan.
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_plugin_ai_document_chunks_embedding_hnsw
    ON plugin_ai.document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. plugin_ai.document_embeddings.embedding
--    Legacy standalone vector store also declared in 01_rebuild_database.sql.
--    Index was only present in the init script — ensures prod incremental
--    upgrades also get it.
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_plugin_ai_document_embeddings_embedding_hnsw
    ON plugin_ai.document_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
