-- B175 供应商评价状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE scm.supplier_evaluations DROP CONSTRAINT IF EXISTS ck_scm_supplier_evaluations_status_standard;
ALTER TABLE scm.supplier_evaluations ADD CONSTRAINT ck_scm_supplier_evaluations_status_standard
  CHECK (status = ANY (ARRAY['draft','submitted','approved','completed'])) NOT VALID;

COMMIT;
