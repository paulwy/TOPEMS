-- 2026-10-30 第三批修复：wms.outbound_orders 补 order_date 列
-- 根因：data_sync outbound_to_shipping 的 SELECT/UPDATE 引用 order_date，但建表缺该列，
-- 导致真实登录态 smoke POST /sync/outbound-order/{id}/to-shipping 500。
-- 生产库同步执行（幂等）。

ALTER TABLE wms.outbound_orders
    ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
