-- TOPEMS database migration 20260920000088
-- GET 业务 code500 第四批：修正 000086 补错表 + 新增缺列 + 类型对齐
-- 代码 SQL 实际表：
--   wms.inventory_alert_records（非 inventory_alerts）缺 rule_id/item_id/item_code/alert_level/threshold_quantity
--   public.qa_lab_tasks 缺 sample_no（lims inspection_task）
--   public.qa_lab_sample_lifecycle 缺 tenant_id（lims sample lifecycle）
--   srm.bid_requests / srm.bids 缺 tenant_id（bid_price）
--   scm.suppliers 缺 code（supplier-performance）
--   wms.warehouses 缺 name（value-by-warehouse）
--   wms.transfer_order_items 缺 item_code（transfer 明细）
--   mes.capacities.used_hours NUMERIC → FLOAT8（代码 decode f64）
-- 幂等，双库安全。

DO $$
BEGIN
  IF to_regclass('wms.inventory_alert_records') IS NOT NULL THEN
    ALTER TABLE wms.inventory_alert_records ADD COLUMN IF NOT EXISTS rule_id UUID;
    ALTER TABLE wms.inventory_alert_records ADD COLUMN IF NOT EXISTS item_id UUID;
    ALTER TABLE wms.inventory_alert_records ADD COLUMN IF NOT EXISTS item_code TEXT;
    ALTER TABLE wms.inventory_alert_records ADD COLUMN IF NOT EXISTS alert_level TEXT;
    ALTER TABLE wms.inventory_alert_records ADD COLUMN IF NOT EXISTS threshold_quantity NUMERIC;
  END IF;
  IF to_regclass('public.qa_lab_tasks') IS NOT NULL THEN
    ALTER TABLE public.qa_lab_tasks ADD COLUMN IF NOT EXISTS sample_no TEXT;
  END IF;
  IF to_regclass('public.qa_lab_sample_lifecycle') IS NOT NULL THEN
    ALTER TABLE public.qa_lab_sample_lifecycle ADD COLUMN IF NOT EXISTS tenant_id UUID;
  END IF;
  IF to_regclass('srm.bid_requests') IS NOT NULL THEN
    ALTER TABLE srm.bid_requests ADD COLUMN IF NOT EXISTS tenant_id UUID;
  END IF;
  IF to_regclass('srm.bids') IS NOT NULL THEN
    ALTER TABLE srm.bids ADD COLUMN IF NOT EXISTS tenant_id UUID;
  END IF;
  IF to_regclass('scm.suppliers') IS NOT NULL THEN
    ALTER TABLE scm.suppliers ADD COLUMN IF NOT EXISTS code TEXT;
  END IF;
  IF to_regclass('wms.warehouses') IS NOT NULL THEN
    ALTER TABLE wms.warehouses ADD COLUMN IF NOT EXISTS name TEXT;
  END IF;
  IF to_regclass('wms.transfer_order_items') IS NOT NULL THEN
    ALTER TABLE wms.transfer_order_items ADD COLUMN IF NOT EXISTS item_code TEXT;
  END IF;
  IF to_regclass('mes.capacities') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='capacities' AND column_name='used_hours' AND data_type='numeric') THEN
      ALTER TABLE mes.capacities ALTER COLUMN used_hours TYPE DOUBLE PRECISION USING used_hours::double precision;
    END IF;
  END IF;
END $$;
