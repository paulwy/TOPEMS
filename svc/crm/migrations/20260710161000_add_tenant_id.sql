-- CRM 多租户支持 - 添加 tenant_id 字段
-- 日期: 2026-07-10

-- 确保 crm schema 存在
CREATE SCHEMA IF NOT EXISTS crm;

-- ============================================
--  customers 表
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'customers'
    ) THEN
        -- 添加 tenant_id 列
        ALTER TABLE crm.customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        -- 使用默认值填充现有数据
        UPDATE crm.customers 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        -- 设置 NOT NULL 约束
        ALTER TABLE crm.customers ALTER COLUMN tenant_id SET NOT NULL;
        
        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON crm.customers(tenant_id);
        
        -- 启用行级安全
        ALTER TABLE crm.customers ENABLE ROW LEVEL SECURITY;
        
        -- 创建策略
        DROP POLICY IF EXISTS tenant_isolation ON crm.customers;
        CREATE POLICY tenant_isolation ON crm.customers
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- ============================================
--  contacts 表
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'contacts'
    ) THEN
        ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE crm.contacts 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE crm.contacts ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON crm.contacts(tenant_id);
        
        ALTER TABLE crm.contacts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON crm.contacts;
        CREATE POLICY tenant_isolation ON crm.contacts
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- 同时检查 plugin_crm schema
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_crm' AND table_name = 'contacts'
    ) THEN
        ALTER TABLE plugin_crm.contacts ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE plugin_crm.contacts 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE plugin_crm.contacts ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON plugin_crm.contacts(tenant_id);
        
        ALTER TABLE plugin_crm.contacts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON plugin_crm.contacts;
        CREATE POLICY tenant_isolation ON plugin_crm.contacts
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- ============================================
--  opportunities 表
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'opportunities'
    ) THEN
        ALTER TABLE crm.opportunities ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE crm.opportunities 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE crm.opportunities ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id ON crm.opportunities(tenant_id);
        
        ALTER TABLE crm.opportunities ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON crm.opportunities;
        CREATE POLICY tenant_isolation ON crm.opportunities
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_crm' AND table_name = 'opportunities'
    ) THEN
        ALTER TABLE plugin_crm.opportunities ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE plugin_crm.opportunities 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE plugin_crm.opportunities ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id ON plugin_crm.opportunities(tenant_id);
        
        ALTER TABLE plugin_crm.opportunities ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON plugin_crm.opportunities;
        CREATE POLICY tenant_isolation ON plugin_crm.opportunities
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- ============================================
--  interactions 表
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'interactions'
    ) THEN
        ALTER TABLE crm.interactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE crm.interactions 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE crm.interactions ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_interactions_tenant_id ON crm.interactions(tenant_id);
        
        ALTER TABLE crm.interactions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON crm.interactions;
        CREATE POLICY tenant_isolation ON crm.interactions
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_crm' AND table_name = 'interactions'
    ) THEN
        ALTER TABLE plugin_crm.interactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE plugin_crm.interactions 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE plugin_crm.interactions ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_interactions_tenant_id ON plugin_crm.interactions(tenant_id);
        
        ALTER TABLE plugin_crm.interactions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON plugin_crm.interactions;
        CREATE POLICY tenant_isolation ON plugin_crm.interactions
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- ============================================
--  tags 表
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'tags'
    ) THEN
        ALTER TABLE crm.tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE crm.tags 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE crm.tags ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON crm.tags(tenant_id);
        
        ALTER TABLE crm.tags ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON crm.tags;
        CREATE POLICY tenant_isolation ON crm.tags
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- ============================================
--  customer_tags 表
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'customer_tags'
    ) THEN
        ALTER TABLE crm.customer_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE crm.customer_tags 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE crm.customer_tags ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_customer_tags_tenant_id ON crm.customer_tags(tenant_id);
        
        ALTER TABLE crm.customer_tags ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON crm.customer_tags;
        CREATE POLICY tenant_isolation ON crm.customer_tags
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- ============================================
--  billing_records 表
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'billing_records'
    ) THEN
        ALTER TABLE crm.billing_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE crm.billing_records 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE crm.billing_records ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_billing_records_tenant_id ON crm.billing_records(tenant_id);
        
        ALTER TABLE crm.billing_records ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON crm.billing_records;
        CREATE POLICY tenant_isolation ON crm.billing_records
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_crm' AND table_name = 'billing_records'
    ) THEN
        ALTER TABLE plugin_crm.billing_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE plugin_crm.billing_records 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE plugin_crm.billing_records ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_billing_records_tenant_id ON plugin_crm.billing_records(tenant_id);
        
        ALTER TABLE plugin_crm.billing_records ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON plugin_crm.billing_records;
        CREATE POLICY tenant_isolation ON plugin_crm.billing_records
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- ============================================
--  customer_scores 表
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'customer_scores'
    ) THEN
        ALTER TABLE crm.customer_scores ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE crm.customer_scores 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE crm.customer_scores ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_customer_scores_tenant_id ON crm.customer_scores(tenant_id);
        
        ALTER TABLE crm.customer_scores ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON crm.customer_scores;
        CREATE POLICY tenant_isolation ON crm.customer_scores
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- ============================================
--  sales_forecasts 表
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'sales_forecasts'
    ) THEN
        ALTER TABLE crm.sales_forecasts ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE crm.sales_forecasts 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE crm.sales_forecasts ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_sales_forecasts_tenant_id ON crm.sales_forecasts(tenant_id);
        
        ALTER TABLE crm.sales_forecasts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON crm.sales_forecasts;
        CREATE POLICY tenant_isolation ON crm.sales_forecasts
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;

-- ============================================
--  audit_logs 表 (检查是否有 entity_type 列)
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'crm' AND table_name = 'audit_logs'
    ) THEN
        -- 检查是否有 entity_type 列
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'crm' 
              AND table_name = 'audit_logs' 
              AND column_name = 'entity_type'
        ) THEN
            ALTER TABLE crm.audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
        END IF;
        
        -- 添加 tenant_id
        ALTER TABLE crm.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
        
        UPDATE crm.audit_logs 
        SET tenant_id = COALESCE(
            (SELECT id FROM public.tenants LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        ALTER TABLE crm.audit_logs ALTER COLUMN tenant_id SET NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON crm.audit_logs(tenant_id);
        
        ALTER TABLE crm.audit_logs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS tenant_isolation ON crm.audit_logs;
        CREATE POLICY tenant_isolation ON crm.audit_logs
            FOR ALL
            USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    END IF;
END $$;
