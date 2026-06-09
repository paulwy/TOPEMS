-- ============================================
-- AI 服务数据库迁移
-- 描述: 文档处理、向量化存储、向量检索、知识库管理
-- 生成时间: 2026-06-08T21:34:08.321Z
-- ============================================

BEGIN;

SET search_path TO ai, public;

-- 向量扩展 (pgvector) - 用于 embedding 字段的向量相似度检索
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ai;

-- ============================================
-- 表: knowledge_bases
-- 知识库表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.knowledge_bases (
    id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4() -- 知识库ID,
    name                           VARCHAR(255) NOT NULL -- 名称,
    code                           VARCHAR(100) UNIQUE -- 代码,
    description                    TEXT -- 描述,
    embedding_model                VARCHAR(100) NOT NULL -- 嵌入模型,
    vector_dimension               INTEGER NOT NULL -- 向量维度,
    chunk_size                     INTEGER DEFAULT 512 -- 分块大小,
    chunk_overlap                  INTEGER DEFAULT 50 -- 分块重叠,
    document_count                 INTEGER DEFAULT 0 -- 文档数,
    status                         VARCHAR(50) NOT NULL DEFAULT 'active' -- 状态,
    created_by                     UUID -- 创建人ID,
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

-- ============================================
-- 表: documents
-- 文档表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.documents (
    id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4() -- 文档ID,
    knowledge_base_id              UUID NOT NULL -- 知识库ID,
    title                          VARCHAR(255) NOT NULL -- 标题,
    file_path                      TEXT NOT NULL -- 文件路径,
    file_name                      VARCHAR(255) -- 文件名,
    file_size                      BIGINT -- 文件大小,
    file_type                      VARCHAR(100) -- 文件类型,
    content_hash                   VARCHAR(100) UNIQUE -- 内容哈希,
    chunk_count                    INTEGER DEFAULT 0 -- 分块数,
    status                         VARCHAR(50) NOT NULL DEFAULT 'pending' -- 状态,
    processed_at                   TIMESTAMPTZ -- 处理时间,
    created_by                     UUID -- 创建人ID,
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

-- ============================================
-- 表: document_chunks
-- 文档分块表（支持 pgvector 向量检索）
-- ============================================
CREATE TABLE IF NOT EXISTS ai.document_chunks (
    id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4() -- 分块ID,
    document_id                    UUID NOT NULL -- 文档ID,
    knowledge_base_id              UUID NOT NULL -- 知识库ID,
    chunk_index                    INTEGER NOT NULL DEFAULT 0 -- 在源文档中的切分序号,
    content                        TEXT NOT NULL -- 内容文本,
    content_hash                   VARCHAR(64) -- 内容哈希用于去重,
    embedding                      vector(1536) NOT NULL -- 向量嵌入，维度由模型决定，默认 1536,
    vector_dimensions              INTEGER DEFAULT 1536 -- 向量维度,
    token_count                    INTEGER DEFAULT 0 -- 切分后 token 数量,
    embedding_status               VARCHAR(50) DEFAULT 'pending' -- 向量状态,
    embedding_model                VARCHAR(255) -- 生成向量所用模型名,
    metadata                       JSONB -- 元数据,
    created_by                     UUID -- 创建人ID,
    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                     TIMESTAMPTZ DEFAULT NOW(),
    created_by                     UUID,
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

-- ============================================
-- 表: search_queries
-- 搜索查询记录表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.search_queries (
    id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4() -- 查询ID,
    knowledge_base_id              UUID -- 知识库ID,
    query_text                     TEXT NOT NULL -- 查询文本,
    top_k                          INTEGER DEFAULT 5 -- 返回数量,
    score_threshold                DOUBLE PRECISION DEFAULT 0.7 -- 阈值,
    result_count                   INTEGER -- 结果数,
    response_time_ms               INTEGER -- 响应时间(ms),
    created_by                     UUID -- 创建人ID,
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

-- ============================================
-- 表: ai_models
-- AI 模型配置表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.ai_models (
    id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4() -- 模型ID,
    name                           VARCHAR(255) NOT NULL UNIQUE -- 模型名称,
    model_type                     VARCHAR(50) NOT NULL -- 模型类型,
    provider                       VARCHAR(100) NOT NULL -- 提供商,
    api_endpoint                   TEXT -- API 地址,
    api_key                        TEXT -- API Key(加密),
    model_params                   JSONB -- 模型参数,
    is_default                     BOOLEAN DEFAULT false -- 是否默认,
    status                         VARCHAR(50) DEFAULT 'active' -- 状态,
    created_by                     UUID -- 创建人ID,
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

-- ============================================
-- 表: conversations
-- 对话记录表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.conversations (
    id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4() -- 对话ID,
    knowledge_base_id              UUID -- 关联知识库ID,
    title                          VARCHAR(255) -- 对话标题,
    message_count                  INTEGER DEFAULT 0 -- 消息数,
    model_id                       UUID -- 使用的模型ID,
    status                         VARCHAR(50) DEFAULT 'active' -- 状态,
    created_by                     UUID NOT NULL -- 创建人ID,
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

-- ============================================
-- 表: conversation_messages
-- 对话消息表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.conversation_messages (
    id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4() -- 消息ID,
    conversation_id                UUID NOT NULL -- 对话ID,
    role                           VARCHAR(50) NOT NULL -- 角色,
    content                        TEXT NOT NULL -- 内容,
    tokens_used                    INTEGER -- Token 使用数,
    response_time_ms               INTEGER -- 响应时间(ms),
    metadata                       JSONB -- 元数据,
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

-- ============================================
-- 表: embedding_tasks
-- 向量化任务表
-- ============================================
CREATE TABLE IF NOT EXISTS ai.embedding_tasks (
    id                             UUID PRIMARY KEY DEFAULT uuid_generate_v4() -- 任务ID,
    task_type                      VARCHAR(50) NOT NULL -- 任务类型,
    document_id                    UUID -- 文档ID,
    knowledge_base_id              UUID -- 知识库ID,
    total_chunks                   INTEGER DEFAULT 0 -- 总分块,
    processed_chunks               INTEGER DEFAULT 0 -- 已处理分块,
    status                         VARCHAR(50) NOT NULL DEFAULT 'pending' -- 状态,
    error_message                  TEXT -- 错误信息,
    started_at                     TIMESTAMPTZ -- 开始时间,
    completed_at                   TIMESTAMPTZ -- 完成时间,
    created_by                     UUID -- 创建人ID,
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
