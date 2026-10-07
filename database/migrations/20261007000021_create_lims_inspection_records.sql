-- =============================================================================
-- 20261007000021_create_lims_inspection_records.sql
-- =============================================================================
-- 修复 BE-01（审计 P1）：lims 事件处理器向两库均不存在的
--   lims_inspection_records 执行 INSERT ... ON CONFLICT DO NOTHING。
-- 证据：svc/lims/src/event_handlers/mod.rs:59-74
--   INSERT INTO lims_inspection_records
--     (record_no, source_type, source_inspection_id, product_id, product_name,
--      result, qualification_rate, inspector, status, tenant_id, created_at, updated_at)
--     VALUES ($1, 'qms', $2, $3, $4, $5, $6, $7, 'completed',
--             '00000000-0000-0000-0000-000000000000', $8, $8)
--     ON CONFLICT (source_type, source_inspection_id) DO NOTHING RETURNING id
--
-- 决策：(a) 必需 —— 补建表。
--   该写入把 QMS 检验完成结果同步落为 LIMS 实验室检验记录（mod.rs:65-72，活跃路径），
--   是 LIMS 域承接上游检验数据的核心记录。运行期 search_path = "lims, public"
--   （svc/lims/src/main.rs:74），非限定表名解析到 lims schema。
--
-- 列对齐 INSERT；注意：
--   - INSERT 不含 id 但 RETURNING id → id 需 DEFAULT gen_random_uuid()。
--   - product_id 为 Option<Uuid>（event_types.rs:466）→ UUID 可空。
--   - qualification_rate 为 Option<f64>（event_types.rs:469）→ double precision 可空。
--   - ON CONFLICT(source_type, source_inspection_id) → 唯一约束仅这两列（不含 tenant_id）。
-- 幂等：CREATE TABLE IF NOT EXISTS + 唯一约束/策略幂等守卫。
-- =============================================================================

CREATE TABLE IF NOT EXISTS lims.lims_inspection_records (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_no            TEXT NOT NULL,
    source_type          TEXT NOT NULL,
    source_inspection_id UUID NOT NULL,
    product_id           UUID,
    product_name         TEXT NOT NULL DEFAULT '',
    result               TEXT NOT NULL,
    qualification_rate   DOUBLE PRECISION,
    inspector            TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'completed',
    tenant_id            UUID,
    created_at           TIMESTAMPTZ NOT NULL,
    updated_at           TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'lims'
          AND c.conname = 'lims_inspection_records_source_uniq'
    ) THEN
        ALTER TABLE lims.lims_inspection_records
            ADD CONSTRAINT lims_inspection_records_source_uniq
            UNIQUE (source_type, source_inspection_id);
    END IF;
END $$;

ALTER TABLE lims.lims_inspection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lims.lims_inspection_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON lims.lims_inspection_records;
CREATE POLICY tenant_isolation ON lims.lims_inspection_records
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
