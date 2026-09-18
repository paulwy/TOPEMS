-- ============================================================================
-- mes.production_orders 补齐 source_order_id/source_order_number/workshop_id（幂等）
-- 背景：远端代码 INSERT/SELECT 引用这三列（生产订单来源订单 + 车间归属），
--       双库 5432/5433 结构均缺失（代码超前于表）。
-- 幂等：ADD COLUMN IF NOT EXISTS；类型按代码 struct 推断（Option<Uuid>/Option<String>）。
-- ============================================================================
ALTER TABLE mes.production_orders ADD COLUMN IF NOT EXISTS source_order_id uuid;
ALTER TABLE mes.production_orders ADD COLUMN IF NOT EXISTS source_order_number character varying;
ALTER TABLE mes.production_orders ADD COLUMN IF NOT EXISTS workshop_id uuid;
