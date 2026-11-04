-- ============================================================
-- P5b: prod 残留 3 条误用 *_status_standard CHECK 清理
--
-- 背景：20261103000002_global_remove_misapplied_status_standard_checks.sql 在 prod 账本
--   中登记为 success=true，但 prod 只读盘点 2026-11-04 实测仍有 3 条约束未删；
--   这 3 张表不在该迁移的 327 条显式清单内（该清单只含 mes/plugin_mes 的 audit_logs
--   与 srm.inquiries，不含 crm.audit_logs / integration.external_erp_sync_logs）。
--   即：账本 success ≠ DDL 到位，需单独补齐。
--
-- 约束名取自 prod 实测 pg_constraint（非猜测）：
--   crm.audit_logs                          → ck_audit_logs_status_standard
--   integration.external_erp_sync_logs      → ck_external_erp_sync_logs_status_standard
--   srm.inquiries                           → ck_inquiries_status_standard
-- 保留项（不在本文件范围）：crm.returns.ck_returns_status_standard、
--   mobile.mobile_tasks.ck_mobile_tasks_status_standard —— 属业务合法约束。
--
-- 语义：模板 CHECK 为 (status IS NULL OR status IN ('active','inactive','archived'))，
--   与业务领域态（draft/pending/...）冲突，删约束零数据风险（仅放宽）。
-- 幂等：DROP CONSTRAINT IF EXISTS，表不存在则跳过。
-- 回滚：如需恢复，按文件头三条约束名与固定表达式重建：
--   ADD CONSTRAINT ... CHECK (status IS NULL OR status IN ('active','inactive','archived'));
-- ============================================================

SET lock_timeout = '5s';

DO $$
BEGIN
  IF to_regclass('crm.audit_logs') IS NOT NULL THEN
    ALTER TABLE crm.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('integration.external_erp_sync_logs') IS NOT NULL THEN
    ALTER TABLE integration.external_erp_sync_logs
      DROP CONSTRAINT IF EXISTS ck_external_erp_sync_logs_status_standard;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('srm.inquiries') IS NOT NULL THEN
    ALTER TABLE srm.inquiries DROP CONSTRAINT IF EXISTS ck_inquiries_status_standard;
  END IF;
END
$$;
