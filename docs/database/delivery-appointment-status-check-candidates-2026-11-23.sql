-- B173 送货预约状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE scm.supplier_delivery_appointments DROP CONSTRAINT IF EXISTS ck_scm_supplier_delivery_appointments_status_standard;
ALTER TABLE scm.supplier_delivery_appointments ADD CONSTRAINT ck_scm_supplier_delivery_appointments_status_standard
  CHECK (status = ANY (ARRAY['pending','approved','rejected','arrived','completed','cancelled'])) NOT VALID;

COMMIT;
