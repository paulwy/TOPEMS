-- Add tenant_id to all SRM tables
-- 多租户支持迁移脚本

SET search_path TO plugin_srm;

-- ==================== 添加 tenant_id 列 ====================

-- 供应商表
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 供应商类别表
ALTER TABLE supplier_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 供应商评估表
ALTER TABLE supplier_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 供应商合同表
ALTER TABLE supplier_contracts ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 合同条款表
ALTER TABLE contract_terms ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 供应商产品表
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 采购订单表
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 评分维度表
ALTER TABLE scoring_dimensions ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 审计日志表
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 招标表（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tenders'
    ) THEN
        ALTER TABLE tenders ADD COLUMN IF NOT EXISTS tenant_id UUID;
    END IF;
END $$;

-- 投标表（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_bids'
    ) THEN
        ALTER TABLE tender_bids ADD COLUMN IF NOT EXISTS tenant_id UUID;
    END IF;
END $$;

-- 定标表（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_awards'
    ) THEN
        ALTER TABLE tender_awards ADD COLUMN IF NOT EXISTS tenant_id UUID;
    END IF;
END $$;

-- 报价表（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'bid_prices'
    ) THEN
        ALTER TABLE bid_prices ADD COLUMN IF NOT EXISTS tenant_id UUID;
    END IF;
END $$;

-- ==================== 填充 tenant_id 数据 ====================

-- 使用 organization_id 或默认 UUID 填充
-- 注意：这里使用一个默认的 UUID，实际部署时应根据实际情况调整
DO $$
DECLARE
    default_tenant UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
    -- 供应商表
    UPDATE suppliers SET tenant_id = COALESCE(
        (SELECT organization_id FROM audit_logs WHERE audit_logs.table_name = 'suppliers' AND audit_logs.record_id = suppliers.id LIMIT 1),
        default_tenant
    ) WHERE tenant_id IS NULL;

    -- 供应商类别表
    UPDATE supplier_categories SET tenant_id = default_tenant WHERE tenant_id IS NULL;

    -- 供应商评估表
    UPDATE supplier_evaluations SET tenant_id = COALESCE(
        (SELECT s.tenant_id FROM suppliers s WHERE s.id = supplier_evaluations.supplier_id),
        default_tenant
    ) WHERE tenant_id IS NULL;

    -- 供应商合同表
    UPDATE supplier_contracts SET tenant_id = COALESCE(
        (SELECT s.tenant_id FROM suppliers s WHERE s.id = supplier_contracts.supplier_id),
        default_tenant
    ) WHERE tenant_id IS NULL;

    -- 合同条款表
    UPDATE contract_terms SET tenant_id = COALESCE(
        (SELECT sc.tenant_id FROM supplier_contracts sc WHERE sc.id = contract_terms.contract_id),
        default_tenant
    ) WHERE tenant_id IS NULL;

    -- 供应商产品表
    UPDATE supplier_products SET tenant_id = COALESCE(
        (SELECT s.tenant_id FROM suppliers s WHERE s.id = supplier_products.supplier_id),
        default_tenant
    ) WHERE tenant_id IS NULL;

    -- 采购订单表
    UPDATE purchase_orders SET tenant_id = COALESCE(
        (SELECT s.tenant_id FROM suppliers s WHERE s.id = purchase_orders.supplier_id),
        default_tenant
    ) WHERE tenant_id IS NULL;

    -- 评分维度表
    UPDATE scoring_dimensions SET tenant_id = default_tenant WHERE tenant_id IS NULL;

    -- 审计日志表
    UPDATE audit_logs SET tenant_id = COALESCE(organization_id, default_tenant) WHERE tenant_id IS NULL;
END $$;

-- ==================== 设置 NOT NULL 约束 ====================

ALTER TABLE suppliers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE supplier_categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE supplier_evaluations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE supplier_contracts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE contract_terms ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE supplier_products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE purchase_orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE scoring_dimensions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;

-- 招标相关表（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tenders' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE tenders ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_bids' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE tender_bids ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_awards' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE tender_awards ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- ==================== 创建索引 ====================

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_categories_tenant_id ON supplier_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_tenant_id ON supplier_evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_tenant_id ON supplier_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_terms_tenant_id ON contract_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_tenant_id ON supplier_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scoring_dimensions_tenant_id ON scoring_dimensions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);

-- 招标相关表索引（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tenders'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_tenders_tenant_id ON tenders(tenant_id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_bids'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_tender_bids_tenant_id ON tender_bids(tenant_id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_awards'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_tender_awards_tenant_id ON tender_awards(tenant_id);
    END IF;
END $$;

-- ==================== 启用行级安全策略 (RLS) ====================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 招标相关表 RLS（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tenders'
    ) THEN
        ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_bids'
    ) THEN
        ALTER TABLE tender_bids ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_awards'
    ) THEN
        ALTER TABLE tender_awards ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ==================== 创建 RLS 策略 ====================

-- 注意：这里使用 current_setting('app.current_tenant')::UUID 来获取当前租户
-- 需要配合 rls_middleware 使用

DROP POLICY IF EXISTS tenant_isolation_policy ON suppliers;
CREATE POLICY tenant_isolation_policy ON suppliers
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON supplier_categories;
CREATE POLICY tenant_isolation_policy ON supplier_categories
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON supplier_evaluations;
CREATE POLICY tenant_isolation_policy ON supplier_evaluations
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON supplier_contracts;
CREATE POLICY tenant_isolation_policy ON supplier_contracts
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON contract_terms;
CREATE POLICY tenant_isolation_policy ON contract_terms
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON supplier_products;
CREATE POLICY tenant_isolation_policy ON supplier_products
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON purchase_orders;
CREATE POLICY tenant_isolation_policy ON purchase_orders
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON scoring_dimensions;
CREATE POLICY tenant_isolation_policy ON scoring_dimensions
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

DROP POLICY IF EXISTS tenant_isolation_policy ON audit_logs;
CREATE POLICY tenant_isolation_policy ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 招标相关表 RLS 策略（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tenders'
    ) THEN
        DROP POLICY IF EXISTS tenant_isolation_policy ON tenders;
        CREATE POLICY tenant_isolation_policy ON tenders
            USING (tenant_id = current_setting('app.current_tenant')::UUID);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_bids'
    ) THEN
        DROP POLICY IF EXISTS tenant_isolation_policy ON tender_bids;
        CREATE POLICY tenant_isolation_policy ON tender_bids
            USING (tenant_id = current_setting('app.current_tenant')::UUID);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'plugin_srm' AND table_name = 'tender_awards'
    ) THEN
        DROP POLICY IF EXISTS tenant_isolation_policy ON tender_awards;
        CREATE POLICY tenant_isolation_policy ON tender_awards
            USING (tenant_id = current_setting('app.current_tenant')::UUID);
    END IF;
END $$;

-- 检查 audit_logs 表是否有 entity_type 列
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'plugin_srm' AND table_name = 'audit_logs' AND column_name = 'entity_type'
    ) THEN
        RAISE NOTICE 'audit_logs 表已存在 entity_type 列';
    ELSE
        RAISE NOTICE 'audit_logs 表不存在 entity_type 列';
    END IF;
END $$;

-- Reset search path
RESET search_path;
