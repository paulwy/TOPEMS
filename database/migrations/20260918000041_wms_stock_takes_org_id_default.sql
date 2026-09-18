-- TOPEMS database migration 20260918000041
-- wms.stock_takes.org_id NOT NULL 无默认，create INSERT 只填 organization_id 未填 org_id
-- （同 000032/000039 处理模式）：设默认单租户 org_id；DO 块守卫（重建库可能无该列）。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='wms' AND table_name='stock_takes' AND column_name='org_id') THEN
        ALTER TABLE wms.stock_takes
            ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    END IF;
END $$;
