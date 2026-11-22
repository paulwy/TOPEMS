-- B172 采购合同状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE scm.purchase_contracts DROP CONSTRAINT IF EXISTS ck_scm_purchase_contracts_status_standard;
ALTER TABLE scm.purchase_contracts ADD CONSTRAINT ck_scm_purchase_contracts_status_standard
  CHECK (status = ANY (ARRAY['draft','pending','reviewing','approved','rejected','signed','cancelled','expired','terminated'])) NOT VALID;

COMMIT;
