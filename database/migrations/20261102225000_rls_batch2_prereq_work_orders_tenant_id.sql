-- RLS batch2 前置：mes.work_orders 补 tenant_id 列（2026-11-02，幂等）
-- 依据：20261102230000 batch2 在 topems/topems_test/topems_prepare 应用失败——列不存在；
--       topems_prod / 5433 的 work_orders 已含 tenant_id（结构差异）
ALTER TABLE mes.work_orders ADD COLUMN IF NOT EXISTS tenant_id uuid;
