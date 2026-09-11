-- WMS 入库订单：添加 order_date 字段
-- 日期：2026-09-11
-- 说明：修复 wms.inbound_orders 表缺少 order_date 列导致 API 500 错误的问题
-- 背景：代码中查询和 INSERT 都使用了 order_date 列，但表结构中缺少该列

-- ============================================
-- 一、添加 order_date 列
-- ============================================

ALTER TABLE wms.inbound_orders 
ADD COLUMN IF NOT EXISTS order_date DATE;

-- ============================================
-- 二、为已有数据填充 order_date（使用 created_at 的日期部分）
-- ============================================

UPDATE wms.inbound_orders 
SET order_date = created_at::DATE 
WHERE order_date IS NULL;

-- ============================================
-- 三、添加索引（按订单日期查询优化）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_inbound_orders_order_date 
ON wms.inbound_orders (order_date);

-- ============================================
-- 四、验证
-- ============================================

-- 验证列已添加
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_schema = 'wms' AND table_name = 'inbound_orders' AND column_name = 'order_date';
