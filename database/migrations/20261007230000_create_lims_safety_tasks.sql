-- =============================================================================
-- 20261007230000_create_lims_safety_tasks.sql
-- =============================================================================
-- 修复 BE-01（审计 P1，与 lims_inspection_records 同批）：lims 事件处理器向
--   不存在的 lims_safety_tasks 执行 INSERT ... ON CONFLICT DO NOTHING。
-- 证据：svc/lims/src/event_handlers/mod.rs:122-136
--   INSERT INTO lims_safety_tasks
--     (task_no, title, category, level, description, location, status,
--      source_type, source_hazard_id, assigned_to, tenant_id, created_at, updated_at)
--     VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'ehs_hazard', $7,
--             'system', '00000000-0000-0000-0000-000000000000', $8, $8)
--     ON CONFLICT (source_type, source_hazard_id) DO NOTHING RETURNING id
--
-- 决策：(a) 必需 —— 补建表。
--   该写入把 EHS 隐患报告事件落为 LIMS 安全检测任务（mod.rs:118-146，活跃路径），
--   是 LIMS 域承接 EHS 隐患治理的核心记录。运行期 search_path = "lims, public"
--   （svc/lims/src/main.rs:74），非限定表名解析到 lims schema。
--
-- 列对齐 INSERT：
--   - INSERT 不含 id 但 RETURNING id → id 需 DEFAULT gen_random_uuid()。
--   - payload 字段（event_types.rs EhsHazardReportedPayload）：
--       title/category/level/description/location → TEXT；
--       hazard_id → UUID（source_hazard_id）。
--   - status 默认 'pending'，source_type 默认 'ehs_hazard'，assigned_to 默认 'system'。
--   - created_at/updated_at 由调用方传入 Utc::now() → TIMESTAMPTZ NOT NULL。
--   - ON CONFLICT(source_type, source_hazard_id) → 唯一约束仅这两列。
-- 幂等：CREATE TABLE IF NOT EXISTS + 唯一约束/策略幂等守卫。
-- =============================================================================

CREATE TABLE IF NOT EXISTS lims.lims_safety_tasks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_no          TEXT NOT NULL,
    title            TEXT NOT NULL,
    category         TEXT NOT NULL,
    level            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    location         TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'pending',
    source_type      TEXT NOT NULL DEFAULT 'ehs_hazard',
    source_hazard_id UUID NOT NULL,
    assigned_to      TEXT NOT NULL DEFAULT 'system',
    tenant_id        UUID,
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'lims'
          AND c.conname = 'lims_safety_tasks_source_uniq'
    ) THEN
        ALTER TABLE lims.lims_safety_tasks
            ADD CONSTRAINT lims_safety_tasks_source_uniq
            UNIQUE (source_type, source_hazard_id);
    END IF;
END $$;

ALTER TABLE lims.lims_safety_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.lims_safety_tasks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON lims.lims_safety_tasks;
CREATE POLICY tenant_isolation ON lims.lims_safety_tasks
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
