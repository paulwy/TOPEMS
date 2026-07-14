-- ============================================
-- AI 索引优化
-- 生成时间: 2026-06-08T21:34:08.321Z
-- ============================================

BEGIN;

SET search_path TO ai, public;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ai;

-- 复合索引(建议): knowledge_bases
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_composite
    ON ai.knowledge_bases (name, status);

-- 全文搜索索引: knowledge_bases
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_name_search
    ON ai.knowledge_bases USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_description_search
    ON ai.knowledge_bases USING gin (to_tsvector('simple', description));

-- 复合索引(建议): documents
CREATE INDEX IF NOT EXISTS idx_documents_composite
    ON ai.documents (knowledge_base_id, title, file_type);

-- 全文搜索索引: documents
CREATE INDEX IF NOT EXISTS idx_documents_title_search
    ON ai.documents USING gin (to_tsvector('simple', title));

-- 复合索引: document_chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_composite_0
    ON ai.document_chunks (document_id, chunk_index);

-- 向量索引: document_chunks (pgvector HNSW, 余弦相似度)
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_embedding
    ON ai.document_chunks USING hnsw (embedding vector_cosine_ops);

-- 全文搜索索引: document_chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_search
    ON ai.document_chunks USING gin (to_tsvector('simple', content));

-- 全文搜索索引: search_queries
CREATE INDEX IF NOT EXISTS idx_search_queries_query_text_search
    ON ai.search_queries USING gin (to_tsvector('simple', query_text));

-- 复合索引(建议): ai_models
CREATE INDEX IF NOT EXISTS idx_ai_models_composite
    ON ai.ai_models (model_type, provider, is_default);

-- 复合索引(建议): conversations
CREATE INDEX IF NOT EXISTS idx_conversations_composite
    ON ai.conversations (knowledge_base_id, status, created_by);

-- 全文搜索索引: conversations
CREATE INDEX IF NOT EXISTS idx_conversations_title_search
    ON ai.conversations USING gin (to_tsvector('simple', title));

-- 复合索引(建议): conversation_messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_composite
    ON ai.conversation_messages (conversation_id, role);

-- 全文搜索索引: conversation_messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_content_search
    ON ai.conversation_messages USING gin (to_tsvector('simple', content));

-- 复合索引(建议): embedding_tasks
CREATE INDEX IF NOT EXISTS idx_embedding_tasks_composite
    ON ai.embedding_tasks (task_type, document_id, knowledge_base_id);

COMMIT;
