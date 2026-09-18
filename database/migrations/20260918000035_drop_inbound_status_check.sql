-- TOPEMS database migration 20260918000035
-- wms.inbound_orders.status check 约束允许值（active/inactive/archived）与代码状态机
-- （created/confirmed/received 等）冲突，INSERT 报 ck_inbound_orders_status_standard。
-- 移除过时约束（代码为状态机权威）；幂等。

ALTER TABLE wms.inbound_orders DROP CONSTRAINT IF EXISTS ck_inbound_orders_status_standard;
