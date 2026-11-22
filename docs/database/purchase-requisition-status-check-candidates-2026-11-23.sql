-- B171 采购申请状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE scm.purchase_requisitions DROP CONSTRAINT IF EXISTS ck_scm_purchase_requisitions_status_standard;
ALTER TABLE scm.purchase_requisitions ADD CONSTRAINT ck_scm_purchase_requisitions_status_standard
  CHECK (status = ANY (ARRAY['draft','pending','approved','rejected','cancelled','converted'])) NOT VALID;

COMMIT;
