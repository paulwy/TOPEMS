-- 2026-10-08：mes.production_orders 补 order_number 列
-- 背景：handler SQL 使用 order_number（AS order_no 映射响应），但表仅有 order_no 列
-- （5432 实测缺失），导致 list/create 查询生产必挂。本迁移幂等补列并同步存量数据。
-- 已先在 5432 手动 ALTER 验证（integration_tests 47 全绿），此处入迁移链固化。

ALTER TABLE mes.production_orders
    ADD COLUMN IF NOT EXISTS order_number VARCHAR(64);

UPDATE mes.production_orders
SET order_number = order_no
WHERE order_number IS NULL AND order_no IS NOT NULL;
