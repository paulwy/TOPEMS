-- ============================================
-- AI 服务数据库迁移
-- 描述: 文档处理、向量化存储、向量检索、知识库管理
-- 生成时间: 2026-06-08T22:31:33.390Z
-- ============================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS ai;

SET search_path TO ai, public;

-- 基础扩展 (pgcrypto) - 提供 uuid_generate_v4() 函数
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 向量扩展 (pgvector) - 用于 embedding 字段的向量相似度检索
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ai;

-- ============================================
-- 表: knowledge_bases
-- 知识库表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.knowledge_bases (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                           VARCHAR(255) NOT NULL,
    code                           VARCHAR(100) UNIQUE,
    description                    TEXT,
    embedding_model                VARCHAR(100) NOT NULL,
    vector_dimension               INTEGER NOT NULL,
    chunk_size                     INTEGER DEFAULT 512,
    chunk_overlap                  INTEGER DEFAULT 50,
    document_count                 INTEGER DEFAULT 0,
    status                         VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by                     UUID,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    organization_id                UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    deleted_at                     TIMESTAMPTZ
);

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION ai.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_knowledge_bases_update_timestamp
    ON ai.knowledge_bases;

CREATE TRIGGER trigger_knowledge_bases_update_timestamp
    BEFORE UPDATE ON ai.knowledge_bases
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_created_at
    ON ai.knowledge_bases (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_organization_id
    ON ai.knowledge_bases (organization_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_deleted_at
    ON ai.knowledge_bases (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_name
    ON ai.knowledge_bases (name);

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_status
    ON ai.knowledge_bases (status);

COMMENT ON TABLE ai.knowledge_bases IS '知识库表';
COMMENT ON COLUMN ai.knowledge_bases.id IS '知识库ID';
COMMENT ON COLUMN ai.knowledge_bases.name IS '名称';
COMMENT ON COLUMN ai.knowledge_bases.code IS '代码';
COMMENT ON COLUMN ai.knowledge_bases.description IS '描述';
COMMENT ON COLUMN ai.knowledge_bases.embedding_model IS '嵌入模型';
COMMENT ON COLUMN ai.knowledge_bases.vector_dimension IS '向量维度';
COMMENT ON COLUMN ai.knowledge_bases.chunk_size IS '分块大小';
COMMENT ON COLUMN ai.knowledge_bases.chunk_overlap IS '分块重叠';
COMMENT ON COLUMN ai.knowledge_bases.document_count IS '文档数';
COMMENT ON COLUMN ai.knowledge_bases.status IS '状态';
COMMENT ON COLUMN ai.knowledge_bases.created_by IS '创建人ID';

-- ============================================
-- 表: documents
-- 文档表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.documents (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id              UUID NOT NULL,
    title                          VARCHAR(255) NOT NULL,
    file_path                      TEXT NOT NULL,
    file_name                      VARCHAR(255),
    file_size                      BIGINT,
    file_type                      VARCHAR(100),
    content_hash                   VARCHAR(100) UNIQUE,
    chunk_count                    INTEGER DEFAULT 0,
    status                         VARCHAR(50) NOT NULL DEFAULT 'pending',
    processed_at                   TIMESTAMPTZ,
    created_by                     UUID,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    organization_id                UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    deleted_at                     TIMESTAMPTZ
);

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION ai.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documents_update_timestamp
    ON ai.documents;

CREATE TRIGGER trigger_documents_update_timestamp
    BEFORE UPDATE ON ai.documents
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_documents_created_at
    ON ai.documents (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_organization_id
    ON ai.documents (organization_id);

CREATE INDEX IF NOT EXISTS idx_documents_deleted_at
    ON ai.documents (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_knowledge_base_id
    ON ai.documents (knowledge_base_id);

CREATE INDEX IF NOT EXISTS idx_documents_title
    ON ai.documents (title);

CREATE INDEX IF NOT EXISTS idx_documents_file_type
    ON ai.documents (file_type);

CREATE INDEX IF NOT EXISTS idx_documents_status
    ON ai.documents (status);

COMMENT ON TABLE ai.documents IS '文档表';
COMMENT ON COLUMN ai.documents.id IS '文档ID';
COMMENT ON COLUMN ai.documents.knowledge_base_id IS '知识库ID';
COMMENT ON COLUMN ai.documents.title IS '标题';
COMMENT ON COLUMN ai.documents.file_path IS '文件路径';
COMMENT ON COLUMN ai.documents.file_name IS '文件名';
COMMENT ON COLUMN ai.documents.file_size IS '文件大小';
COMMENT ON COLUMN ai.documents.file_type IS '文件类型';
COMMENT ON COLUMN ai.documents.content_hash IS '内容哈希';
COMMENT ON COLUMN ai.documents.chunk_count IS '分块数';
COMMENT ON COLUMN ai.documents.status IS '状态';
COMMENT ON COLUMN ai.documents.processed_at IS '处理时间';
COMMENT ON COLUMN ai.documents.created_by IS '创建人ID';

-- ============================================
-- 表: document_chunks
-- 文档分块表（支持 pgvector 向量检索）
-- ============================================
CREATE TABLE IF NOT EXISTS ai.document_chunks (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id                    UUID NOT NULL,
    knowledge_base_id              UUID NOT NULL,
    chunk_index                    INTEGER NOT NULL DEFAULT 0,
    content                        TEXT NOT NULL,
    content_hash                   VARCHAR(64),
    embedding                      vector(1536) NOT NULL,
    vector_dimensions              INTEGER DEFAULT 1536,
    token_count                    INTEGER DEFAULT 0,
    embedding_status               VARCHAR(50) DEFAULT 'pending',
    embedding_model                VARCHAR(255),
    metadata                       JSONB,
    created_by                     UUID,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    organization_id                UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    deleted_at                     TIMESTAMPTZ,
    CONSTRAINT fk_document_chunks_document_id_0 FOREIGN KEY (document_id) REFERENCES ai.documents(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_document_chunks_knowledge_base_id_1 FOREIGN KEY (knowledge_base_id) REFERENCES ai.knowledge_bases(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION ai.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_chunks_update_timestamp
    ON ai.document_chunks;

CREATE TRIGGER trigger_document_chunks_update_timestamp
    BEFORE UPDATE ON ai.document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at
    ON ai.document_chunks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_chunks_organization_id
    ON ai.document_chunks (organization_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_deleted_at
    ON ai.document_chunks (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
    ON ai.document_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_knowledge_base_id
    ON ai.document_chunks (knowledge_base_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index
    ON ai.document_chunks (chunk_index);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_status
    ON ai.document_chunks (embedding_status);

CREATE INDEX IF NOT EXISTS idx_document_chunks_composite_0
    ON ai.document_chunks (document_id, chunk_index);

COMMENT ON TABLE ai.document_chunks IS '文档分块表（支持 pgvector 向量检索）';
COMMENT ON COLUMN ai.document_chunks.id IS '分块ID';
COMMENT ON COLUMN ai.document_chunks.document_id IS '文档ID';
COMMENT ON COLUMN ai.document_chunks.knowledge_base_id IS '知识库ID';
COMMENT ON COLUMN ai.document_chunks.chunk_index IS '在源文档中的切分序号';
COMMENT ON COLUMN ai.document_chunks.content IS '内容文本';
COMMENT ON COLUMN ai.document_chunks.content_hash IS '内容哈希用于去重';
COMMENT ON COLUMN ai.document_chunks.embedding IS '向量嵌入，维度由模型决定，默认 1536';
COMMENT ON COLUMN ai.document_chunks.vector_dimensions IS '向量维度';
COMMENT ON COLUMN ai.document_chunks.token_count IS '切分后 token 数量';
COMMENT ON COLUMN ai.document_chunks.embedding_status IS '向量状态';
COMMENT ON COLUMN ai.document_chunks.embedding_model IS '生成向量所用模型名';
COMMENT ON COLUMN ai.document_chunks.metadata IS '元数据';
COMMENT ON COLUMN ai.document_chunks.created_by IS '创建人ID';

-- ============================================
-- 表: search_queries
-- 搜索查询记录表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.search_queries (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id              UUID,
    query_text                     TEXT NOT NULL,
    top_k                          INTEGER DEFAULT 5,
    score_threshold                DOUBLE PRECISION DEFAULT 0.7,
    result_count                   INTEGER,
    response_time_ms               INTEGER,
    created_by                     UUID,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    organization_id                UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    deleted_at                     TIMESTAMPTZ
);

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION ai.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_search_queries_update_timestamp
    ON ai.search_queries;

CREATE TRIGGER trigger_search_queries_update_timestamp
    BEFORE UPDATE ON ai.search_queries
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_search_queries_created_at
    ON ai.search_queries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_queries_organization_id
    ON ai.search_queries (organization_id);

CREATE INDEX IF NOT EXISTS idx_search_queries_deleted_at
    ON ai.search_queries (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_search_queries_knowledge_base_id
    ON ai.search_queries (knowledge_base_id);

COMMENT ON TABLE ai.search_queries IS '搜索查询记录表';
COMMENT ON COLUMN ai.search_queries.id IS '查询ID';
COMMENT ON COLUMN ai.search_queries.knowledge_base_id IS '知识库ID';
COMMENT ON COLUMN ai.search_queries.query_text IS '查询文本';
COMMENT ON COLUMN ai.search_queries.top_k IS '返回数量';
COMMENT ON COLUMN ai.search_queries.score_threshold IS '阈值';
COMMENT ON COLUMN ai.search_queries.result_count IS '结果数';
COMMENT ON COLUMN ai.search_queries.response_time_ms IS '响应时间(ms)';
COMMENT ON COLUMN ai.search_queries.created_by IS '创建人ID';

-- ============================================
-- 表: ai_models
-- AI 模型配置表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.ai_models (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                           VARCHAR(255) NOT NULL UNIQUE,
    model_type                     VARCHAR(50) NOT NULL,
    provider                       VARCHAR(100) NOT NULL,
    api_endpoint                   TEXT,
    api_key                        TEXT,
    model_params                   JSONB,
    is_default                     BOOLEAN DEFAULT false,
    status                         VARCHAR(50) DEFAULT 'active',
    created_by                     UUID,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    organization_id                UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    deleted_at                     TIMESTAMPTZ
);

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION ai.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_models_update_timestamp
    ON ai.ai_models;

CREATE TRIGGER trigger_ai_models_update_timestamp
    BEFORE UPDATE ON ai.ai_models
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_ai_models_created_at
    ON ai.ai_models (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_models_organization_id
    ON ai.ai_models (organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_models_deleted_at
    ON ai.ai_models (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_models_model_type
    ON ai.ai_models (model_type);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider
    ON ai.ai_models (provider);

CREATE INDEX IF NOT EXISTS idx_ai_models_is_default
    ON ai.ai_models (is_default);

CREATE INDEX IF NOT EXISTS idx_ai_models_status
    ON ai.ai_models (status);

COMMENT ON TABLE ai.ai_models IS 'AI 模型配置表';
COMMENT ON COLUMN ai.ai_models.id IS '模型ID';
COMMENT ON COLUMN ai.ai_models.name IS '模型名称';
COMMENT ON COLUMN ai.ai_models.model_type IS '模型类型';
COMMENT ON COLUMN ai.ai_models.provider IS '提供商';
COMMENT ON COLUMN ai.ai_models.api_endpoint IS 'API 地址';
COMMENT ON COLUMN ai.ai_models.api_key IS 'API Key(加密)';
COMMENT ON COLUMN ai.ai_models.model_params IS '模型参数';
COMMENT ON COLUMN ai.ai_models.is_default IS '是否默认';
COMMENT ON COLUMN ai.ai_models.status IS '状态';
COMMENT ON COLUMN ai.ai_models.created_by IS '创建人ID';

-- ============================================
-- 表: conversations
-- 对话记录表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.conversations (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id              UUID,
    title                          VARCHAR(255),
    message_count                  INTEGER DEFAULT 0,
    model_id                       UUID,
    status                         VARCHAR(50) DEFAULT 'active',
    created_by                     UUID NOT NULL,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    organization_id                UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    deleted_at                     TIMESTAMPTZ
);

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION ai.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_conversations_update_timestamp
    ON ai.conversations;

CREATE TRIGGER trigger_conversations_update_timestamp
    BEFORE UPDATE ON ai.conversations
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_conversations_created_at
    ON ai.conversations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_organization_id
    ON ai.conversations (organization_id);

CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at
    ON ai.conversations (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_knowledge_base_id
    ON ai.conversations (knowledge_base_id);

CREATE INDEX IF NOT EXISTS idx_conversations_status
    ON ai.conversations (status);

CREATE INDEX IF NOT EXISTS idx_conversations_created_by
    ON ai.conversations (created_by);

COMMENT ON TABLE ai.conversations IS '对话记录表';
COMMENT ON COLUMN ai.conversations.id IS '对话ID';
COMMENT ON COLUMN ai.conversations.knowledge_base_id IS '关联知识库ID';
COMMENT ON COLUMN ai.conversations.title IS '对话标题';
COMMENT ON COLUMN ai.conversations.message_count IS '消息数';
COMMENT ON COLUMN ai.conversations.model_id IS '使用的模型ID';
COMMENT ON COLUMN ai.conversations.status IS '状态';
COMMENT ON COLUMN ai.conversations.created_by IS '创建人ID';

-- ============================================
-- 表: conversation_messages
-- 对话消息表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.conversation_messages (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id                UUID NOT NULL,
    role                           VARCHAR(50) NOT NULL,
    content                        TEXT NOT NULL,
    tokens_used                    INTEGER,
    response_time_ms               INTEGER,
    metadata                       JSONB,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    created_by                     UUID,
    organization_id                UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    deleted_at                     TIMESTAMPTZ
);

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION ai.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_conversation_messages_update_timestamp
    ON ai.conversation_messages;

CREATE TRIGGER trigger_conversation_messages_update_timestamp
    BEFORE UPDATE ON ai.conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at
    ON ai.conversation_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_organization_id
    ON ai.conversation_messages (organization_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_deleted_at
    ON ai.conversation_messages (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id
    ON ai.conversation_messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_role
    ON ai.conversation_messages (role);

COMMENT ON TABLE ai.conversation_messages IS '对话消息表';
COMMENT ON COLUMN ai.conversation_messages.id IS '消息ID';
COMMENT ON COLUMN ai.conversation_messages.conversation_id IS '对话ID';
COMMENT ON COLUMN ai.conversation_messages.role IS '角色';
COMMENT ON COLUMN ai.conversation_messages.content IS '内容';
COMMENT ON COLUMN ai.conversation_messages.tokens_used IS 'Token 使用数';
COMMENT ON COLUMN ai.conversation_messages.response_time_ms IS '响应时间(ms)';
COMMENT ON COLUMN ai.conversation_messages.metadata IS '元数据';

-- ============================================
-- 表: embedding_tasks
-- 向量化任务表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.embedding_tasks (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type                      VARCHAR(50) NOT NULL,
    document_id                    UUID,
    knowledge_base_id              UUID,
    total_chunks                   INTEGER DEFAULT 0,
    processed_chunks               INTEGER DEFAULT 0,
    status                         VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message                  TEXT,
    started_at                     TIMESTAMPTZ,
    completed_at                   TIMESTAMPTZ,
    created_by                     UUID,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    organization_id                UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    deleted_at                     TIMESTAMPTZ
);

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION ai.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_embedding_tasks_update_timestamp
    ON ai.embedding_tasks;

CREATE TRIGGER trigger_embedding_tasks_update_timestamp
    BEFORE UPDATE ON ai.embedding_tasks
    FOR EACH ROW
    EXECUTE FUNCTION ai.update_timestamp();

CREATE INDEX IF NOT EXISTS idx_embedding_tasks_created_at
    ON ai.embedding_tasks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_embedding_tasks_organization_id
    ON ai.embedding_tasks (organization_id);

CREATE INDEX IF NOT EXISTS idx_embedding_tasks_deleted_at
    ON ai.embedding_tasks (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_embedding_tasks_task_type
    ON ai.embedding_tasks (task_type);

CREATE INDEX IF NOT EXISTS idx_embedding_tasks_document_id
    ON ai.embedding_tasks (document_id);

CREATE INDEX IF NOT EXISTS idx_embedding_tasks_knowledge_base_id
    ON ai.embedding_tasks (knowledge_base_id);

CREATE INDEX IF NOT EXISTS idx_embedding_tasks_status
    ON ai.embedding_tasks (status);

COMMENT ON TABLE ai.embedding_tasks IS '向量化任务表';
COMMENT ON COLUMN ai.embedding_tasks.id IS '任务ID';
COMMENT ON COLUMN ai.embedding_tasks.task_type IS '任务类型';
COMMENT ON COLUMN ai.embedding_tasks.document_id IS '文档ID';
COMMENT ON COLUMN ai.embedding_tasks.knowledge_base_id IS '知识库ID';
COMMENT ON COLUMN ai.embedding_tasks.total_chunks IS '总分块';
COMMENT ON COLUMN ai.embedding_tasks.processed_chunks IS '已处理分块';
COMMENT ON COLUMN ai.embedding_tasks.status IS '状态';
COMMENT ON COLUMN ai.embedding_tasks.error_message IS '错误信息';
COMMENT ON COLUMN ai.embedding_tasks.started_at IS '开始时间';
COMMENT ON COLUMN ai.embedding_tasks.completed_at IS '完成时间';
COMMENT ON COLUMN ai.embedding_tasks.created_by IS '创建人ID';

-- ============================================
-- 表: audit_logs (ai)
-- ============================================
CREATE TABLE IF NOT EXISTS ai.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    organization_id UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_user_id
    ON ai.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_action
    ON ai.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at
    ON ai.audit_logs (created_at DESC);

COMMENT ON TABLE ai.audit_logs IS '审计日志表';

COMMIT;
