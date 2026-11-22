-- B154 · TMS 运单状态唯一集合候选 CHECK（NOT VALID）
-- 值集来源：svc/tms/src/modules/shipment_status.rs（ShipmentStatus）
-- 读取/创建/发车/到达/取消/审批/驳回均绑定 draft/pending/in_transit/delivered/cancelled。
-- 本地 tms.tms_shipments 0 行。

ALTER TABLE tms.tms_shipments
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE tms.tms_shipments
  ADD CONSTRAINT ck_tms_shipments_status_standard
  CHECK (status = ANY (ARRAY['draft','pending','in_transit','delivered','cancelled']))
  NOT VALID;

-- 回滚：
-- ALTER TABLE tms.tms_shipments DROP CONSTRAINT IF EXISTS ck_tms_shipments_status_standard;
