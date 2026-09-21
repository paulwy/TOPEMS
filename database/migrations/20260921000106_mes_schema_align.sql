-- 000106: mes schema 结构对齐（编译/运行双库一致性）
-- 背景：mes 运行库(5433)的 production_orders 有 order_no NOT NULL（历史遗留，不在迁移内），
--       编译参考库(5432)缺失该列，导致编译期 sqlx 在线解析报 column does not exist；
--       同时 mes.teams / mes.equipment_oee 缺失 tenant_id 列，而代码查询（租户 RLS 过滤）
--       显式引用 t.tenant_id / oee.tenant_id。
-- 本迁移幂等补齐：两库可重放；NOT NULL 列带 DEFAULT '' 保证旧行可加列。

-- 1. production_orders.order_no（与运行库已有列对齐；已存在则跳过）
ALTER TABLE mes.production_orders ADD COLUMN IF NOT EXISTS order_no VARCHAR(100) NOT NULL DEFAULT '';

-- 2. teams.tenant_id（租户隔离过滤所需）
ALTER TABLE mes.teams ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 3. equipment_oee.tenant_id（租户隔离过滤所需）
ALTER TABLE mes.equipment_oee ADD COLUMN IF NOT EXISTS tenant_id UUID;
