-- 20261120110000: AI 4 张运行期表收口（W2-D2 首个模块）
--
-- 背景：ai.documents / ai.document_chunks / ai.qa_history / ai.analysis_results
-- 长期由 svc/ai/src/schema_defense.rs 在启动时 CREATE TABLE + ADD COLUMN 维护，
-- 代码 TABLE_DEFS 与线上真实形状已经漂移（例如 documents.tags 线上为 jsonb，
-- TABLE_DEFS 写的是 TEXT[]；documents.title 线上为 text，TABLE_DEFS 写 varchar）。
-- 本迁移以当前 baseline+forward 库的真实形状为准固化，运行期不再建表/补列。
--
-- 幂等：CREATE TABLE / INDEX / FUNCTION IF NOT EXISTS；策略与触发器先 DROP IF EXISTS。
-- 可重复执行；不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE OR REPLACE FUNCTION ai.update_documents_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS ai.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    tenant_id uuid,
    title text DEFAULT ''::text NOT NULL,
    file_name text DEFAULT ''::text NOT NULL,
    file_path text,
    file_size bigint,
    mime_type text,
    content_hash text,
    category text,
    tags jsonb,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    chunk_count integer DEFAULT 0,
    created_by uuid,
    knowledge_base_id uuid,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    processed_at timestamptz,
    CONSTRAINT documents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ai.document_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    chunk_index integer DEFAULT 0 NOT NULL,
    content text NOT NULL,
    content_hash varchar(64),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid,
    document_id uuid NOT NULL,
    embedding public.vector(1536) NOT NULL,
    embedding_model varchar(255),
    embedding_status varchar(50) DEFAULT 'pending'::varchar,
    knowledge_base_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_count integer DEFAULT 0,
    vector_dimensions integer DEFAULT 1536,
    CONSTRAINT document_chunks_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ai.qa_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    answer text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    feedback text,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    rating integer,
    sources jsonb DEFAULT '[]'::jsonb,
    tenant_id uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT qa_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ai.analysis_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    analysis_type varchar(50) NOT NULL,
    confidence double precision,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    input_text text NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    result jsonb NOT NULL,
    tenant_id uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT analysis_results_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON ai.documents USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON ai.documents USING btree (category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON ai.documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_documents_title ON ai.documents USING btree (title);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON ai.documents USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON ai.documents USING btree (deleted_at);

CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant_id ON ai.document_chunks USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON ai.document_chunks USING btree (document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON ai.document_chunks USING btree (chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_chunks_deleted_at ON ai.document_chunks USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON ai.document_chunks USING hnsw (embedding public.vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunks_content_search ON ai.document_chunks USING gin (to_tsvector('simple'::regconfig, content));

CREATE INDEX IF NOT EXISTS idx_qa_history_tenant_id ON ai.qa_history USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_history_rating ON ai.qa_history USING btree (rating);
CREATE INDEX IF NOT EXISTS idx_qa_history_created_at ON ai.qa_history USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_history_deleted_at ON ai.qa_history USING btree (deleted_at);

CREATE INDEX IF NOT EXISTS idx_analysis_results_tenant_id ON ai.analysis_results USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_deleted_at ON ai.analysis_results USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON ai.analysis_results USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_type ON ai.analysis_results USING btree (analysis_type);

DROP TRIGGER IF EXISTS update_documents_updated_at ON ai.documents;
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON ai.documents
FOR EACH ROW EXECUTE FUNCTION ai.update_documents_timestamp();

ALTER TABLE ai.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE ai.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.document_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE ai.qa_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.qa_history FORCE ROW LEVEL SECURITY;
ALTER TABLE ai.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.analysis_results FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_isolation ON ai.documents;
CREATE POLICY rls_tenant_isolation ON ai.documents
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ai.document_chunks;
CREATE POLICY rls_tenant_isolation ON ai.document_chunks
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ai.qa_history;
CREATE POLICY rls_tenant_isolation ON ai.qa_history
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ai.analysis_results;
CREATE POLICY rls_tenant_isolation ON ai.analysis_results
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);
