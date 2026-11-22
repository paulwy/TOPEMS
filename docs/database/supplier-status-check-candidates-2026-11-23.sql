-- B163 供应商主数据状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE master_data.mdm_suppliers DROP CONSTRAINT IF EXISTS ck_mdm_suppliers_status_standard;
ALTER TABLE master_data.mdm_suppliers ADD CONSTRAINT ck_mdm_suppliers_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','pending','blacklisted'])) NOT VALID;

ALTER TABLE scm.suppliers DROP CONSTRAINT IF EXISTS ck_suppliers_status_standard;
ALTER TABLE scm.suppliers ADD CONSTRAINT ck_suppliers_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','pending'])) NOT VALID;

COMMIT;
