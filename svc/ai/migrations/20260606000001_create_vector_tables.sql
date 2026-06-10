-- =============================================================
-- TOPEMS-AI Vector Database Migration
-- PostgreSQL with pgvector extension
-- Schema: ai (统一命名空间)
-- =============================================================

-- Enable required extensions
CREATE SCHEMA IF NOT EXISTS ai;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ai;

-- =============================================================
-- Documents Table: 存储文档元数据
-- Table: ai.documents
-- =============================================================
CREATE TABLE IF NOT EXISTS ai.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID,
    title VARCHAR(500) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    content_hash VARCHAR(64),
    category VARCHAR(100),
    tags TEXT[],
    description TEXT,
    chunk_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_status ON ai.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON ai.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON ai.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_title ON ai.documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_kb_id ON ai.documents(knowledge_base_id);

-- =============================================================
-- Document Chunks Table: 存储文档分块（含向量嵌入）
-- Table: ai.document_chunks
-- Note: 向量嵌入已合并到此表，不再使用独立的 vector_embeddings 表
-- =============================================================
CREATE TABLE IF NOT EXISTS ai.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ai.documents(id) ON DELETE CASCADE,
    knowledge_base_id UUID,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    content_hash VARCHAR(64),
    embedding vector(1536) NOT NULL,
    vector_dimensions INTEGER DEFAULT 1536,
    token_count INTEGER DEFAULT 0,
    embedding_status VARCHAR(50) DEFAULT 'pending',
    embedding_model VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chunks indexes
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON ai.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_kb_id ON ai.document_chunks(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON ai.document_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_content_search ON ai.document_chunks USING gin(to_tsvector('chinese', content));
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON ai.document_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- =============================================================
-- Update Timestamp Trigger
-- =============================================================
CREATE OR REPLACE FUNCTION ai.update_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_documents_updated_at ON ai.documents;

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON ai.documents
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_documents_timestamp();

-- =============================================================
-- Comments for documentation
-- =============================================================
COMMENT ON TABLE ai.documents IS 'TOPEMS-AI 知识库文档元数据';
COMMENT ON TABLE ai.document_chunks IS 'TOPEMS-AI 文档分块与向量嵌入（pgvector）';
COMMENT ON COLUMN ai.document_chunks.embedding IS '向量嵌入，使用 cosine 距离';
COMMENT ON INDEX ai.idx_document_chunks_embedding IS 'HNSW 索引，用于近似最近邻搜索';
