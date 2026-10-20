-- ============================================================================
-- 20261020000023_scm_incoming_notices_tenant_id.sql
-- 契约缺口修复：svc/scm incoming_inspection.rs 自 d594c37ac 起对
--   scm.incoming_notices 全部查询显式使用 tenant_id 过滤
--   （tenant_bind_value：superuser→全零恒真，租户用户→按租户隔离），
--   但建表迁移（20260918000060 等）从未包含 tenant_id 列，
--   导致列表/详情/更新/删除端点查询报 column does not exist → 500。
-- 此处按项目 selfheal 惯例（20261007000004 同款写法）幂等补列。
-- 默认值与 tenant_bind_value 的 nil 语义对齐：存量行视为无租户（全租户可见）。
-- ============================================================================
ALTER TABLE scm.incoming_notices
  ADD COLUMN IF NOT EXISTS tenant_id uuid
  NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

CREATE INDEX IF NOT EXISTS idx_scm_incoming_notices_tenant
  ON scm.incoming_notices (tenant_id)
  WHERE tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid;
