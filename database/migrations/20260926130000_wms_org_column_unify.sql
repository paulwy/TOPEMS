-- TOPEMS database migration 20260926130000
-- wms.stock_takes / stock_take_items / discrepancy_records 缺 organization_id 列
-- （其余 wms 表均以 organization_id 为设计标准，schema_defense.rs 亦断言该列；
--   三表仅历史遗留 org_id 列，代码 INSERT 均写 organization_id 单租户值）
-- 补列 + 以 org_id 回填 + NOT NULL DEFAULT 单租户，保持数据一致性。
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['stock_takes', 'stock_take_items', 'discrepancy_records'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'wms' AND table_name = t AND column_name = 'organization_id') THEN
      EXECUTE format('ALTER TABLE wms.%I ADD COLUMN organization_id UUID NOT NULL DEFAULT ''00000000-0000-0000-0000-000000000001''', t);
    END IF;
    -- 以 org_id 现值回填（若为 NULL 则保持默认单租户）
    EXECUTE format('UPDATE wms.%I SET organization_id = org_id WHERE organization_id = ''00000000-0000-0000-0000-000000000001'' AND org_id IS NOT NULL AND org_id <> ''00000000-0000-0000-0000-000000000001''', t);
  END LOOP;
END $$;
