-- 添加 tenant_id 字段到所有 AI 相关表
-- 并启用行级安全

BEGIN;

-- 为 plugin_ai.documents 添加 tenant_id
ALTER TABLE IF EXISTS plugin_ai.documents
    ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

UPDATE plugin_ai.documents
SET tenant_id = COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID);

ALTER TABLE IF EXISTS plugin_ai.documents
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON plugin_ai.documents(tenant_id);

-- 为 plugin_ai.document_chunks 添加 tenant_id
ALTER TABLE IF EXISTS plugin_ai.document_chunks
    ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

UPDATE plugin_ai.document_chunks dc
SET tenant_id = d.tenant_id
FROM plugin_ai.documents d
WHERE dc.document_id = d.id;

UPDATE plugin_ai.document_chunks
SET tenant_id = COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID);

ALTER TABLE IF EXISTS plugin_ai.document_chunks
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_id ON plugin_ai.document_chunks(tenant_id);

-- 为 plugin_ai.vector_embeddings 添加 tenant_id
ALTER TABLE IF EXISTS plugin_ai.vector_embeddings
    ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

UPDATE plugin_ai.vector_embeddings ve
SET tenant_id = dc.tenant_id
FROM plugin_ai.document_chunks dc
WHERE ve.chunk_id = dc.id;

UPDATE plugin_ai.vector_embeddings
SET tenant_id = COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID);

ALTER TABLE IF EXISTS plugin_ai.vector_embeddings
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vector_embeddings_tenant_id ON plugin_ai.vector_embeddings(tenant_id);

-- 为 plugin_ai.analysis_results 添加 tenant_id
ALTER TABLE IF EXISTS plugin_ai.analysis_results
    ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

UPDATE plugin_ai.analysis_results
SET tenant_id = COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID);

ALTER TABLE IF EXISTS plugin_ai.analysis_results
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_results_tenant_id ON plugin_ai.analysis_results(tenant_id);

-- 为 ai.qa_history 添加 tenant_id
ALTER TABLE IF EXISTS ai.qa_history
    ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

UPDATE ai.qa_history
SET tenant_id = COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID);

ALTER TABLE IF EXISTS ai.qa_history
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qa_history_tenant_id ON ai.qa_history(tenant_id);

-- 为 ai.user_profiles 添加 tenant_id
ALTER TABLE IF EXISTS ai.user_profiles
    ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

UPDATE ai.user_profiles
SET tenant_id = COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID);

ALTER TABLE IF EXISTS ai.user_profiles
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON ai.user_profiles(tenant_id);

-- 启用行级安全
ALTER TABLE IF EXISTS plugin_ai.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plugin_ai.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plugin_ai.vector_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plugin_ai.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai.qa_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai.user_profiles ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
CREATE POLICY IF NOT EXISTS "documents_tenant_isolation" ON plugin_ai.documents
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY IF NOT EXISTS "document_chunks_tenant_isolation" ON plugin_ai.document_chunks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY IF NOT EXISTS "vector_embeddings_tenant_isolation" ON plugin_ai.vector_embeddings
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY IF NOT EXISTS "analysis_results_tenant_isolation" ON plugin_ai.analysis_results
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY IF NOT EXISTS "qa_history_tenant_isolation" ON ai.qa_history
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY IF NOT EXISTS "user_profiles_tenant_isolation" ON ai.user_profiles
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

COMMIT;
