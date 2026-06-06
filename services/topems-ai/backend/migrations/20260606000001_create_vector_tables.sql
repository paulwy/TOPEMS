-- =============================================================
-- TOPEMS-AI Vector Database Migration
-- PostgreSQL with pgvector extension
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================
-- Documents Table: 存储文档元数据
-- =============================================================
CREATE TABLE IF NOT EXISTS kb_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000),
    file_size BIGINT,
    mime_type VARCHAR(100),
    content_hash VARCHAR(64),
    category VARCHAR(100),
    tags TEXT[],
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_status ON kb_documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON kb_documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON kb_documents(created_at DESC);

-- =============================================================
-- Document Chunks Table: 存储文档分块
-- =============================================================
CREATE TABLE IF NOT EXISTS kb_document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chunks indexes
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON kb_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_content_search ON kb_document_chunks USING gin(to_tsvector('chinese', content));

-- =============================================================
-- Vector Embeddings Table: 存储向量（使用 pgvector）
-- =============================================================
CREATE TABLE IF NOT EXISTS kb_vector_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES kb_document_chunks(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768),  -- nomic-embed-text 默认 768 维，可根据模型调整
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vector indexes - HNSW index for fast ANN search
CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON kb_vector_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_vectors_document_id ON kb_vector_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_vectors_chunk_id ON kb_vector_embeddings(chunk_id);

-- =============================================================
-- Update Timestamp Trigger
-- =============================================================
CREATE OR REPLACE FUNCTION update_kb_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kb_documents_updated_at
    BEFORE UPDATE ON kb_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_kb_documents_timestamp();

-- =============================================================
-- Comments for documentation
-- =============================================================
COMMENT ON TABLE kb_documents IS 'TOPEMS-AI 知识库文档元数据';
COMMENT ON TABLE kb_document_chunks IS 'TOPEMS-AI 文档分块内容';
COMMENT ON TABLE kb_vector_embeddings IS 'TOPEMS-AI 向量嵌入存储（pgvector）';
COMMENT ON COLUMN kb_vector_embeddings.embedding IS '向量嵌入，使用 cosine 距离';
COMMENT ON INDEX idx_vectors_embedding IS 'HNSW 索引，用于近似最近邻搜索';
