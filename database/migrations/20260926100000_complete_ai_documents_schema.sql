-- 补齐 ai.documents 完整 schema
-- 代码权威: svc/ai/src/services/vector.rs（INSERT/SELECT 列定义）
-- 背景: ai.documents 表此前仅有 id/deleted_at 两列（空壳），
--       create_document/list_documents 等查询期望完整列，集成测试因缺列失败。
-- 幂等: 全部 IF NOT EXISTS，可安全重跑。
ALTER TABLE ai.documents
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS file_name text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS file_path text,
    ADD COLUMN IF NOT EXISTS file_size bigint,
    ADD COLUMN IF NOT EXISTS mime_type text,
    ADD COLUMN IF NOT EXISTS content_hash text,
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS tags jsonb,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS error_message text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
