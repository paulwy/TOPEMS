-- audit_logs 增加审计来源物理列 `origin`（18 张表）
-- 关联方案：docs/architecture/tenant-audit-visibility-plan-20261107.md
--
-- 背景：
--   租户管理员看不到本租户业务审计的根因是 CRM 等服务的 tokio::spawn 写审计时
--   丢失 task-local 租户 + user_id/user_name 为空；代码侧已改为 spawn 前从
--   「被操作实体」捕获 AuditActor{tenant_id,user_id,user_name} 显式传入。
--   本迁移只补 `origin` 物理列（区别于 JSONB），用于区分 request/system/
--   background/event/integration 来源，便于运维筛选；可见性仍由 tenant_id 决定。
--
-- ⚠️ 执行范围：
--   - 仅允许在 rehearsal（8098 + 克隆库）演练；
--   - **禁止直接应用到 prod**。prod 由后续窗口统一安排，且必须先迁移后发布
--     （代码在 origin 非空时会执行 `UPDATE ... SET origin = $1`，列不存在会导致审计写入失败）。
--
-- 执行顺序（与 RLS 那批的合并顺序）：
--   1. 20261107000010_audit_logs_tenant_id_5tables.sql   （补齐 tenant_id）
--   2. 20261107000011_audit_logs_rls_phase2_18tables.sql（RLS Phase 2 策略）
--   3. 本文件 20261107000012_audit_logs_origin_column_18tables.sql（origin 列 + 索引）
--   4. 再发布应用代码（写入显式 tenant/user/origin）
--   回滚顺序与执行相反：先回滚应用代码（或保持其 origin 为 None），再回滚本迁移，
--   最后才考虑回滚 000011（RLS 策略回滚见对应脚本）。
--
-- 回滚脚本：database/scripts/audit_logs_origin_rollback.sql

-- ---------- 18 张 audit_logs：可空列 ----------

ALTER TABLE bi.audit_logs         ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE crm.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE ehs.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE erp.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE flow.audit_logs       ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE gis.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE hrm.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE iam.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE lims.audit_logs       ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE qms.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE scm.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE srm.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE wms.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;

ALTER TABLE shared.audit_logs     ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE public.audit_logs     ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE mes.audit_logs        ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE plugin_mes.audit_logs ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;
ALTER TABLE rs.audit_logs         ADD COLUMN IF NOT EXISTS origin VARCHAR(16) NULL;

-- ---------- 部分索引：只索引非空 origin ----------
-- 历史 nil 行不回填，因此绝大多数旧行为 NULL，部分索引体积很小。

CREATE INDEX IF NOT EXISTS idx_bi_audit_logs_origin
    ON bi.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_origin
    ON crm.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ehs_audit_logs_origin
    ON ehs.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_audit_logs_origin
    ON erp.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flow_audit_logs_origin
    ON flow.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gis_audit_logs_origin
    ON gis.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hrm_audit_logs_origin
    ON hrm.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iam_audit_logs_origin
    ON iam.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lims_audit_logs_origin
    ON lims.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qms_audit_logs_origin
    ON qms.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_audit_logs_origin
    ON scm.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_audit_logs_origin
    ON srm.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wms_audit_logs_origin
    ON wms.audit_logs(origin) WHERE origin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shared_audit_logs_origin
    ON shared.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_public_audit_logs_origin
    ON public.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mes_audit_logs_origin
    ON mes.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plugin_mes_audit_logs_origin
    ON plugin_mes.audit_logs(origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rs_audit_logs_origin
    ON rs.audit_logs(origin) WHERE origin IS NOT NULL;
