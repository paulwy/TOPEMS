-- 回滚 20261127170000：把工位/生产订单的车间外键退回单列 + ON DELETE SET NULL
-- 说明：复合外键是本轮确立的统一口径（租户内挂靠），回滚仅用于应急回退；
--       退回后跨租户可挂靠车间，且删除车间会静默把 workshop_id 置空。
BEGIN;

ALTER TABLE mes.work_stations     DROP CONSTRAINT IF EXISTS work_stations_workshop_tenant_fkey;
ALTER TABLE mes.production_orders DROP CONSTRAINT IF EXISTS production_orders_workshop_tenant_fkey;

ALTER TABLE mes.work_stations
  ADD CONSTRAINT fk_work_stations_workshop
  FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL;

ALTER TABLE mes.production_orders
  ADD CONSTRAINT fk_production_orders_workshop
  FOREIGN KEY (workshop_id) REFERENCES mes.workshops(id) ON DELETE SET NULL;

COMMIT;
