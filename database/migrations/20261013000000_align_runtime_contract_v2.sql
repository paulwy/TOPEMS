-- ============================================================================
-- 20261013000000_align_runtime_contract_v2.sql
-- 运行时契约对齐 v2（2026-10-13 web 契约冒烟复验暴露的 live DB 与 handler 不一致）
--
-- 背景: 20261007140000 对齐时给多张记录型表套用了模板 CHECK
--       `status IN ('active','inactive','archived')`，与业务语义冲突：
--   - audit_logs（iam/mes/srm/wms/bi/plugin_mes/shared）：status 为业务动作自由文本
--     （created/completed/released/…），白名单 CHECK 导致旁路审计写入持续失败。
--   - external_erp_sync_logs：运行状态语义为 running/success/failed，
--     模板 CHECK 拒绝 'running' → 同步任务创建 500。
--   - communication.core_notification_templates：handler 契约引用 priority 列
--     （注释明确"映射为数据库 priority 列 (i32)"），stub 建表漏列 → get/update 500。
--
-- 本迁移幂等，可对任意环境安全重放。
-- ============================================================================

-- ============ 1. audit_logs：记录型审计表，status 为业务自由文本 ============
ALTER TABLE iam.audit_logs            DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE mes.audit_logs            DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE srm.audit_logs            DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE wms.audit_logs            DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE bi.audit_logs             DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE plugin_mes.audit_logs     DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE shared.audit_logs         DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;

-- ============ 2. external_erp_sync_logs：同步运行状态语义 ============
ALTER TABLE integration.external_erp_sync_logs DROP CONSTRAINT IF EXISTS ck_external_erp_sync_logs_status_standard;
ALTER TABLE integration.external_erp_sync_logs
    ADD CONSTRAINT ck_external_erp_sync_logs_status_standard
    CHECK (status IS NULL OR status::text = ANY (ARRAY[
        'active', 'inactive', 'archived',
        'running', 'success', 'failed', 'completed'
    ]::text[]));

-- ============ 3. core_notification_templates：模板优先级/扩展数据列 ============
ALTER TABLE communication.core_notification_templates ADD COLUMN IF NOT EXISTS priority INTEGER;
ALTER TABLE communication.core_notification_templates ADD COLUMN IF NOT EXISTS data JSONB;
