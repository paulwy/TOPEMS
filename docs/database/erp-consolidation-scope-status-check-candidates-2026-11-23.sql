-- B222 · erp.consolidation_scopes.status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/erp/src/modules/consolidation_scope_status.rs
--     ConsolidationScopeStatus::DB_VALUES = draft / active / inactive（默认 draft）
--   与前端 apps/web/src/components/finance/ConsolidationScopePage 的状态选择器一致。
--
-- 本地 topems 已应用（0 行存量；bogus 被拒）。

ALTER TABLE erp.consolidation_scopes
  ADD CONSTRAINT ck_consolidation_scopes_status_standard
  CHECK (status IS NULL OR status IN ('draft', 'active', 'inactive'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE erp.consolidation_scopes DROP CONSTRAINT IF EXISTS ck_consolidation_scopes_status_standard;
