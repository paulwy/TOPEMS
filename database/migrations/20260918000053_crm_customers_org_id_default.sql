-- TOPEMS database migration 20260918000053
-- crm.customers.org_id NOT NULL 无默认，create INSERT 未绑定该列 → 设默认单租户
-- DO 块动态判断，幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='crm' AND table_name='customers' AND column_name='org_id'
                 AND is_nullable='NO' AND column_default IS NULL) THEN
        ALTER TABLE crm.customers
            ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    END IF;
END $$;
