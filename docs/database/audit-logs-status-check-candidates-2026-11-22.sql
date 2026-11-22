-- B159 · 13 张审计表 status 统一候选 CHECK（NOT VALID）
-- 值集来源：lib/shared-db/src/audit.rs（AuditLogStatus）
-- 存量实际值：success / error / failed / unknown / not_found；旧三值约束统一替换。

ALTER TABLE bi.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE bi.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE crm.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE crm.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE erp.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE erp.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE hrm.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE hrm.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE iam.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE iam.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE mes.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE mes.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE plugin_mes.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE plugin_mes.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE public.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE rs.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE rs.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE scm.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE scm.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE shared.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE shared.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE srm.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE srm.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

ALTER TABLE wms.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
ALTER TABLE wms.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','success','failure','failed','error','pending','unknown','not_found'])) NOT VALID;

-- 回滚：按 schema 删除 ck_audit_logs_status_standard 后，恢复原历史约束。
