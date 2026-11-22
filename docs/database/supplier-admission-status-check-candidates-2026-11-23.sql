-- B177 供应商准入状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE scm.supplier_admissions DROP CONSTRAINT IF EXISTS ck_scm_supplier_admissions_status_standard;
ALTER TABLE scm.supplier_admissions ADD CONSTRAINT ck_scm_supplier_admissions_status_standard
  CHECK (status = ANY (ARRAY['draft','pending','approved','rejected','active'])) NOT VALID;

COMMIT;
