-- A-2b: copilot 会话状态落库接真
-- 复用 core.ai_conversations（20261007000009:256），补 copilot 业务列。
ALTER TABLE core.ai_conversations
    ADD COLUMN IF NOT EXISTS module varchar(64) DEFAULT 'erp',
    ADD COLUMN IF NOT EXISTS messages jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS selected_records jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- RLS：会话按租户隔离 + 超管 nil 豁免（同既有范式）
ALTER TABLE core.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.ai_conversations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_conversations_tenant_isolation ON core.ai_conversations;
CREATE POLICY ai_conversations_tenant_isolation ON core.ai_conversations
    USING (
        tenant_id = current_setting('app.tenant_id', true)::uuid
        OR current_setting('app.tenant_id', true)::uuid = '00000000-0000-0000-0000-000000000000'::uuid
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)::uuid
        OR current_setting('app.tenant_id', true)::uuid = '00000000-0000-0000-0000-000000000000'::uuid
    );
