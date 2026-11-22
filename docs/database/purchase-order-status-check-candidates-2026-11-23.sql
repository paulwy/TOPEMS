-- B165 采购订单状态约束（本地应用，生产按窗口执行）
BEGIN;

ALTER TABLE scm.purchase_orders DROP CONSTRAINT IF EXISTS ck_scm_purchase_orders_status_standard;
ALTER TABLE scm.purchase_orders ADD CONSTRAINT ck_scm_purchase_orders_status_standard
  CHECK (status IS NULL OR status = ANY (ARRAY['draft','pending','approved','rejected','confirmed','cancelled','closed','completed'])) NOT VALID;

COMMIT;
