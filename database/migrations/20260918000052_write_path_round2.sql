-- TOPEMS database migration 20260918000052
-- 写路径冒烟批量修复（第 2 轮）：
-- 1) mes.equipment.organization_id NOT NULL 无默认，create INSERT 不填 → 设默认单租户
-- 2) crm.customers 缺 organization_id 列（create INSERT 引用）→ ADD COLUMN
-- 3) erp.assets DROP ck_assets_status_standard（代码 INSERT 固定 status 与约束冲突，同 000043）
-- 4) hrm.companies.tenant_id DROP NOT NULL（create 绑定 Option 可能为 NULL）
-- 5) core_finance_accounts_tenant_id_fkey 引用 core_tenants 无对应行 → DROP（public/finance/rs 三处）
-- DO 块动态判断，幂等且双库安全。

DO $$
DECLARE s text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='mes' AND table_name='equipment' AND column_name='organization_id'
                 AND is_nullable='NO' AND column_default IS NULL) THEN
        ALTER TABLE mes.equipment
            ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='crm' AND table_name='customers')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='crm' AND table_name='customers' AND column_name='organization_id') THEN
        ALTER TABLE crm.customers ADD COLUMN organization_id uuid;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint
               WHERE conrelid = 'erp.assets'::regclass AND conname = 'ck_assets_status_standard') THEN
        ALTER TABLE erp.assets DROP CONSTRAINT ck_assets_status_standard;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='hrm' AND table_name='companies' AND column_name='tenant_id'
                 AND is_nullable='NO') THEN
        ALTER TABLE hrm.companies ALTER COLUMN tenant_id DROP NOT NULL;
    END IF;
    FOREACH s IN ARRAY ARRAY['public','finance','rs'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = s AND table_name = 'core_finance_accounts') THEN
            IF EXISTS (SELECT 1 FROM pg_constraint
                       WHERE conrelid = format('%I.core_finance_accounts', s)::regclass
                         AND conname = 'core_finance_accounts_tenant_id_fkey') THEN
                EXECUTE format('ALTER TABLE %I.core_finance_accounts DROP CONSTRAINT core_finance_accounts_tenant_id_fkey', s);
            END IF;
        END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='hrm' AND table_name='companies' AND column_name='organization_id'
                 AND is_nullable='NO' AND column_default IS NULL) THEN
        ALTER TABLE hrm.companies
            ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    END IF;
END $$;
