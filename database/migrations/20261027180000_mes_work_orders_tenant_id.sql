-- 20261027180000_mes_work_orders_tenant_id.sql
-- 目的：mes.work_orders 此前无 tenant_id 列，租户隔离依赖 order_id→production_orders 关联，
--   导致无 order_id 的独立工单创建后列表/单查均不可见（R7 读回缺口）。
-- 修复：补 tenant_id 列；存量行归零租户（00000000-0000-0000-0000-000000000000）。
ALTER TABLE mes.work_orders
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE mes.work_orders
   SET tenant_id = '00000000-0000-0000-0000-000000000000'
 WHERE tenant_id IS NULL;
