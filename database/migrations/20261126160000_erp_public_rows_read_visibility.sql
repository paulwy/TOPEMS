-- erp 公共主数据「读侧」可见性收口（与检索口径对齐）
--
-- 背景：
--   检索投影（public.search_entity_projections）已把零租户 UUID 视为"公共行"放行，
--   因此公共主数据（如 MAT-001 / SO-TEST-0001 / MCP端到端客户）能搜到；
--   但 erp 侧这几张业务表的 RLS 只放行 `tenant_id = app.tenant_id`，
--   于是同一批公共行在列表页查不到、详情接口直接 404 —— "搜得到、点进去看不到"。
--
-- 处理：
--   只补"读"：每张表新增一条 FOR SELECT 的 permissive 策略，允许读
--   `tenant_id IS NULL`（历史公共行）或 `tenant_id = 零租户`（平台写入的公共行）。
--   写路径完全不变：写仍由既有 FOR ALL 策略约束为"本租户"，任何租户都无法因为
--   这条策略新增/修改公共行。
--
-- 回滚（如需恢复严格隔离）：
--   DROP POLICY IF EXISTS materials_public_read       ON erp.materials;
--   DROP POLICY IF EXISTS purchase_orders_public_read ON erp.purchase_orders;
--   DROP POLICY IF EXISTS sales_orders_public_read    ON erp.sales_orders;
--   DROP POLICY IF EXISTS customers_public_read       ON erp.customers;
--   DROP POLICY IF EXISTS suppliers_public_read       ON erp.suppliers;

DO $$
DECLARE
  t text;
  nil_uuid constant text := '00000000-0000-0000-0000-000000000000';
  pol text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'erp.materials',
    'erp.purchase_orders',
    'erp.sales_orders',
    'erp.customers',
    'erp.suppliers'
  ] LOOP
    IF to_regclass(t) IS NULL THEN
      RAISE NOTICE 'skip (relation missing): %', t;
      CONTINUE;
    END IF;

    pol := split_part(t, '.', 2) || '_public_read';
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR SELECT USING (tenant_id IS NULL OR tenant_id = %L::UUID)',
      pol, t, nil_uuid
    );
    RAISE NOTICE 'public-row read visibility applied: %', t;
  END LOOP;
END $$;

