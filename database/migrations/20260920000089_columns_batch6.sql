-- TOPEMS database migration 20260920000089
-- GET 业务 code500 第五批（DB 侧）：
--   wms.transfer_order_items 缺 item_name（transfer 明细）
--   scm.purchase_orders 缺 delivery_date（supplier-performance 评分）
--   public.qa_lab_tasks 缺 test_items JSONB（lims tasks 列表）
--   mes.capacities.created_at TIMESTAMP → TIMESTAMPTZ（代码 decode DateTime<Utc>）
-- 幂等，双库安全。

DO $$
BEGIN
  IF to_regclass('wms.transfer_order_items') IS NOT NULL THEN
    ALTER TABLE wms.transfer_order_items ADD COLUMN IF NOT EXISTS item_name TEXT;
  END IF;
  IF to_regclass('scm.purchase_orders') IS NOT NULL THEN
    ALTER TABLE scm.purchase_orders ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMPTZ;
  END IF;
  IF to_regclass('public.qa_lab_tasks') IS NOT NULL THEN
    ALTER TABLE public.qa_lab_tasks ADD COLUMN IF NOT EXISTS test_items JSONB;
  END IF;
  IF to_regclass('mes.capacities') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='capacities' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
      ALTER TABLE mes.capacities ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;
  END IF;
END $$;
