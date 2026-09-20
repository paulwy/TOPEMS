-- TOPEMS database migration 20260920000087
-- GET 业务 code500 第三批（DB 侧收尾）：
--   hrm.initialization_status 缺 organization_id（setup/progress 500）
--   scm.supplier_evaluations 缺 total_score（supplier-performance 500）
--   wms.transfer_orders from/to_warehouse_id 列类型 varchar → uuid（代码 ::uuid 过滤）
-- 幂等，双库安全。

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='hrm' AND c.relname='initialization_status' AND c.relkind='r') THEN
    ALTER TABLE hrm.initialization_status ADD COLUMN IF NOT EXISTS organization_id UUID;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='scm' AND c.relname='supplier_evaluations' AND c.relkind='r') THEN
    ALTER TABLE scm.supplier_evaluations ADD COLUMN IF NOT EXISTS total_score NUMERIC(5,2) DEFAULT 0;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='wms' AND c.relname='transfer_orders' AND c.relkind='r') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='wms' AND table_name='transfer_orders' AND column_name='from_warehouse_id' AND data_type='character varying') THEN
      ALTER TABLE wms.transfer_orders ALTER COLUMN from_warehouse_id TYPE UUID USING from_warehouse_id::uuid;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='wms' AND table_name='transfer_orders' AND column_name='to_warehouse_id' AND data_type='character varying') THEN
      ALTER TABLE wms.transfer_orders ALTER COLUMN to_warehouse_id TYPE UUID USING to_warehouse_id::uuid;
    END IF;
  END IF;
END $$;
