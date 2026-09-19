-- TOPEMS database migration 20260920000090
-- GET 业务 code500 第六批（表列 diff 补全）：
--   public.sys_db_changes 缺 old_definition（000086 补错 schema，代码 FROM sys_db_changes 解析 public）
--   public.qa_lab_tasks 缺 actual_start_date/actual_end_date/planned_date/recorded_by/instrument_id
--   wms.transfer_order_items 缺 quantity/order_number/transfer_no
--   scm.suppliers 缺 level
--   mes.capacities.updated_at TIMESTAMP → TIMESTAMPTZ
-- 幂等，双库安全。

DO $$
BEGIN
  IF to_regclass('public.sys_db_changes') IS NOT NULL THEN
    ALTER TABLE public.sys_db_changes ADD COLUMN IF NOT EXISTS old_definition JSONB;
  END IF;
  IF to_regclass('public.qa_lab_tasks') IS NOT NULL THEN
    ALTER TABLE public.qa_lab_tasks ADD COLUMN IF NOT EXISTS actual_start_date TIMESTAMPTZ;
    ALTER TABLE public.qa_lab_tasks ADD COLUMN IF NOT EXISTS actual_end_date TIMESTAMPTZ;
    ALTER TABLE public.qa_lab_tasks ADD COLUMN IF NOT EXISTS planned_date DATE;
    ALTER TABLE public.qa_lab_tasks ADD COLUMN IF NOT EXISTS recorded_by UUID;
    ALTER TABLE public.qa_lab_tasks ADD COLUMN IF NOT EXISTS instrument_id UUID;
  END IF;
  IF to_regclass('wms.transfer_order_items') IS NOT NULL THEN
    ALTER TABLE wms.transfer_order_items ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0;
    ALTER TABLE wms.transfer_order_items ADD COLUMN IF NOT EXISTS order_number TEXT;
    ALTER TABLE wms.transfer_order_items ADD COLUMN IF NOT EXISTS transfer_no TEXT;
  END IF;
  IF to_regclass('scm.suppliers') IS NOT NULL THEN
    ALTER TABLE scm.suppliers ADD COLUMN IF NOT EXISTS level TEXT;
  END IF;
  IF to_regclass('mes.capacities') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='capacities' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
      ALTER TABLE mes.capacities ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    END IF;
  END IF;
END $$;
