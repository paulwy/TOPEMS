-- TOPEMS database migration 20260920000086
-- GET 业务 code500 第二批根因：模块日志精确缺列（模块名来自 topems_*::modules::*）
--   lims inspection_task: sample_no
--   wms inventory_alert:  rule_id
--   scm incoming_inspection: actual_arrival_date
--   srm bid_price: tenant_id
--   erp db_structure: old_definition（sys_db_changes）
--   wms transfer_order 明细: item_id
--   mes capacities: workshop
-- 幂等补列，双库安全。

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='lims' AND c.relname='inspection_tasks' AND c.relkind='r') THEN
    ALTER TABLE lims.inspection_tasks ADD COLUMN IF NOT EXISTS sample_no TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='lims' AND c.relname='samples' AND c.relkind='r') THEN
    ALTER TABLE lims.samples ADD COLUMN IF NOT EXISTS sample_no TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='inventory_alerts' AND c.relkind='r') THEN
    ALTER TABLE wms.inventory_alerts ADD COLUMN IF NOT EXISTS rule_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='incoming_inspections' AND c.relkind='r') THEN
    ALTER TABLE scm.incoming_inspections ADD COLUMN IF NOT EXISTS actual_arrival_date TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='incoming_notices' AND c.relkind='r') THEN
    ALTER TABLE scm.incoming_notices ADD COLUMN IF NOT EXISTS actual_arrival_date TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='srm' AND c.relname='bid_prices' AND c.relkind='r') THEN
    ALTER TABLE srm.bid_prices ADD COLUMN IF NOT EXISTS tenant_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='sys_db_changes' AND c.relkind='r') THEN
    ALTER TABLE erp.sys_db_changes ADD COLUMN IF NOT EXISTS old_definition JSONB;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='transfer_order_items' AND c.relkind='r') THEN
    ALTER TABLE wms.transfer_order_items ADD COLUMN IF NOT EXISTS item_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='capacities' AND c.relkind='r') THEN
    ALTER TABLE mes.capacities ADD COLUMN IF NOT EXISTS workshop TEXT;
  END IF;
END $$;
