-- ============================================================================
-- erp.purchase_orders 表-模型类型对齐（2026-09-17）
-- 背景：容器库建表迁移 20260907000001 中 order_date/delivery_date 为 DATE、
--       total_amount 等 4 金额列为 NUMERIC；代码模型（models/material.rs PurchaseOrder）
--       期望 TIMESTAMPTZ / f64，sqlx 严格类型检查导致列表查询 500。
-- 幂等：仅当列类型不匹配时执行 ALTER（已由 psql 直改的容器库可安全重放）。
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  -- order_date / delivery_date：DATE -> TIMESTAMPTZ
  SELECT data_type INTO t FROM information_schema.columns
    WHERE table_schema='erp' AND table_name='purchase_orders' AND column_name='order_date';
  IF t = 'date' THEN
    EXECUTE 'ALTER TABLE erp.purchase_orders ALTER COLUMN order_date TYPE TIMESTAMPTZ USING order_date::timestamptz';
  END IF;

  SELECT data_type INTO t FROM information_schema.columns
    WHERE table_schema='erp' AND table_name='purchase_orders' AND column_name='delivery_date';
  IF t = 'date' THEN
    EXECUTE 'ALTER TABLE erp.purchase_orders ALTER COLUMN delivery_date TYPE TIMESTAMPTZ USING delivery_date::timestamptz';
  END IF;

  -- 4 金额列：NUMERIC -> DOUBLE PRECISION（代码模型 f64）
  FOREACH t IN ARRAY ARRAY['total_amount','tax_amount','discount_amount','payable_amount'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='erp' AND table_name='purchase_orders' AND column_name=t AND data_type='numeric'
    ) THEN
      EXECUTE format('ALTER TABLE erp.purchase_orders ALTER COLUMN %I TYPE DOUBLE PRECISION USING %I::float8', t, t);
    END IF;
  END LOOP;
END $$;
