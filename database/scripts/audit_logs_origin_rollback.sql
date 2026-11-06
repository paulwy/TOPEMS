-- 回滚 20261107000012_audit_logs_origin_column_18tables.sql
--
-- 顺序要求：
--   1. 先回滚应用代码（或确保所有调用方不再设置 origin，即 CreateAuditLogRequest.origin = None），
--      否则删除列后审计写入会因 `UPDATE ... SET origin = $1` 失败；
--   2. 再执行本脚本删除索引与列；
--   3. 本脚本不触碰 000010/000011 的 tenant_id 与 RLS 策略。
--
-- 仅在 rehearsal 演练；prod 回滚由后续窗口统一安排。

-- ---------- 删除部分索引 ----------

DROP INDEX IF EXISTS bi.idx_bi_audit_logs_origin;
DROP INDEX IF EXISTS crm.idx_crm_audit_logs_origin;
DROP INDEX IF EXISTS ehs.idx_ehs_audit_logs_origin;
DROP INDEX IF EXISTS erp.idx_erp_audit_logs_origin;
DROP INDEX IF EXISTS flow.idx_flow_audit_logs_origin;
DROP INDEX IF EXISTS gis.idx_gis_audit_logs_origin;
DROP INDEX IF EXISTS hrm.idx_hrm_audit_logs_origin;
DROP INDEX IF EXISTS iam.idx_iam_audit_logs_origin;
DROP INDEX IF EXISTS lims.idx_lims_audit_logs_origin;
DROP INDEX IF EXISTS qms.idx_qms_audit_logs_origin;
DROP INDEX IF EXISTS scm.idx_scm_audit_logs_origin;
DROP INDEX IF EXISTS srm.idx_srm_audit_logs_origin;
DROP INDEX IF EXISTS wms.idx_wms_audit_logs_origin;
DROP INDEX IF EXISTS shared.idx_shared_audit_logs_origin;
DROP INDEX IF EXISTS public.idx_public_audit_logs_origin;
DROP INDEX IF EXISTS mes.idx_mes_audit_logs_origin;
DROP INDEX IF EXISTS plugin_mes.idx_plugin_mes_audit_logs_origin;
DROP INDEX IF EXISTS rs.idx_rs_audit_logs_origin;

-- ---------- 删除列 ----------

ALTER TABLE bi.audit_logs         DROP COLUMN IF EXISTS origin;
ALTER TABLE crm.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE ehs.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE erp.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE flow.audit_logs       DROP COLUMN IF EXISTS origin;
ALTER TABLE gis.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE hrm.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE iam.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE lims.audit_logs       DROP COLUMN IF EXISTS origin;
ALTER TABLE qms.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE scm.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE srm.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE wms.audit_logs        DROP COLUMN IF EXISTS origin;

ALTER TABLE shared.audit_logs     DROP COLUMN IF EXISTS origin;
ALTER TABLE public.audit_logs     DROP COLUMN IF EXISTS origin;
ALTER TABLE mes.audit_logs        DROP COLUMN IF EXISTS origin;
ALTER TABLE plugin_mes.audit_logs DROP COLUMN IF EXISTS origin;
ALTER TABLE rs.audit_logs         DROP COLUMN IF EXISTS origin;
