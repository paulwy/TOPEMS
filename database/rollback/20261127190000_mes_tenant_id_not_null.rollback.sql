-- 回滚 20261127190000：放开 mes.work_stations / mes.production_orders 的 tenant_id NOT NULL
-- 说明：回填的 tenant_id 不回退（把行退回「无租户」没有意义，只会重新打开隔离缺口）。
BEGIN;

ALTER TABLE mes.work_stations     ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE mes.production_orders ALTER COLUMN tenant_id DROP NOT NULL;

COMMIT;
