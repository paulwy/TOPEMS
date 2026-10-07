-- =============================================================================
-- 20261007000020_create_integration_sync_logs.sql
-- =============================================================================
-- 修复 BE-01（审计 P1）：integration 事件处理器向两库均不存在的
--   integration_sync_logs 执行 INSERT ... ON CONFLICT DO NOTHING。
-- 证据：svc/integration/src/event_handlers/mod.rs:88-105
--   INSERT INTO integration_sync_logs
--     (id, sync_type, source_system, target_system, status, trace_id, details,
--      started_at, source_type, source_id, tenant_id)
--     VALUES ($1..$10, '00000000-0000-0000-0000-000000000000')
--     ON CONFLICT (source_type, source_id, tenant_id) DO NOTHING RETURNING id
--
-- 决策：(a) 必需 —— 补建表。
--   该写入是跨系统集成同步审计日志：QMS→LIMS / EHS→QMS / LIMS→EHS 三类触发
--   （mod.rs:146/171/196）各落一条同步记录，是集成链路可观测/排障的基础；
--   属活跃调用路径。运行期 search_path = "integration, public"
--   （svc/integration/src/main.rs:32），非限定表名解析到 integration schema。
--
-- 列对齐 INSERT；ON CONFLICT(source_type, source_id, tenant_id) 需唯一约束。
-- 幂等：CREATE TABLE IF NOT EXISTS + 唯一约束/策略幂等守卫。
-- =============================================================================

CREATE TABLE IF NOT EXISTS integration.integration_sync_logs (
    id            UUID PRIMARY KEY,
    sync_type     TEXT NOT NULL,
    source_system TEXT NOT NULL,
    target_system TEXT NOT NULL,
    status        TEXT NOT NULL,
    trace_id      TEXT NOT NULL DEFAULT '',
    details       TEXT NOT NULL DEFAULT '',
    started_at    TIMESTAMPTZ NOT NULL,
    source_type   TEXT NOT NULL,
    source_id     UUID NOT NULL,
    tenant_id     UUID
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'integration'
          AND c.conname = 'integration_sync_logs_source_uniq'
    ) THEN
        ALTER TABLE integration.integration_sync_logs
            ADD CONSTRAINT integration_sync_logs_source_uniq
            UNIQUE (source_type, source_id, tenant_id);
    END IF;
END $$;

ALTER TABLE integration.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.integration_sync_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON integration.integration_sync_logs;
CREATE POLICY tenant_isolation ON integration.integration_sync_logs
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
