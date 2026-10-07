-- =============================================================================
-- 20261007000018_create_hrm_cache_invalidation_logs.sql
-- =============================================================================
-- 修复 BE-01（审计 P1）：hrm 事件处理器向两库均不存在的
--   hrm_cache_invalidation_logs 执行 INSERT。
-- 证据：svc/hrm/src/event_handlers/mod.rs:57-69
--   INSERT INTO hrm_cache_invalidation_logs
--     (id, cache_type, cache_key, operation, source_event, invalidated_at, tenant_id)
--     VALUES ($1,$2,$3,$4,$5,$6, '00000000-0000-0000-0000-000000000000') RETURNING id
--
-- 决策：(a) 必需 —— 补建表。
--   该写入是缓存失效审计日志（PermissionChanged / PositionCreated|Updated|Deleted
--   四类事件触发，mod.rs:110/133/159/163/182/187 共 6 处调用），用于持久化追踪
--   哪个缓存键在何时因何事件失效，是缓存一致性排查的观测基础；属活跃调用路径，
--   非死代码。运行期 search_path = "hrm, public, shared"（svc/hrm/src/main.rs:27），
--   非限定表名 hrm_cache_invalidation_logs 解析到 hrm schema。
--
-- 列对齐 INSERT 实际使用的全部列；按既有 *_logs 表约定补 tenant_id + created_at，
-- 并启用 RLS + 租户隔离策略（与 integration.external_erp_staging 一致）。
-- 幂等：CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS。
-- =============================================================================

CREATE TABLE IF NOT EXISTS hrm.hrm_cache_invalidation_logs (
    id             UUID PRIMARY KEY,
    cache_type     TEXT NOT NULL,
    cache_key      TEXT NOT NULL,
    operation      TEXT NOT NULL,
    source_event   TEXT NOT NULL,
    invalidated_at TIMESTAMPTZ NOT NULL,
    tenant_id      UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hrm.hrm_cache_invalidation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrm.hrm_cache_invalidation_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON hrm.hrm_cache_invalidation_logs;
CREATE POLICY tenant_isolation ON hrm.hrm_cache_invalidation_logs
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
