-- B161 SCM 本地主数据引用状态约束（代码会写 deleted，旧 public 镜像约束未覆盖本表）
BEGIN;

ALTER TABLE scm.scm_master_data_refs DROP CONSTRAINT IF EXISTS ck_scm_master_data_refs_status_standard;
ALTER TABLE scm.scm_master_data_refs ADD CONSTRAINT ck_scm_master_data_refs_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','deleted'])) NOT VALID;

COMMIT;
