-- SRM Schema Migration
-- 供应商关系管理系统

-- Create schema
CREATE SCHEMA IF NOT EXISTS srm;

-- Set search path
SET search_path TO srm;

-- ==================== 供应商管理表 ====================

-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    tax_id VARCHAR(50),
    address VARCHAR(500),
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(200),
    credit_rating VARCHAR(20),
    risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 供应商类别表
CREATE TABLE IF NOT EXISTS supplier_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES srm.supplier_categories(id),
    level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 供应商评估表
CREATE TABLE IF NOT EXISTS supplier_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES srm.suppliers(id),
    evaluation_no VARCHAR(50) NOT NULL UNIQUE,
    evaluation_date TIMESTAMPTZ NOT NULL,
    evaluator VARCHAR(100),
    overall_score NUMERIC(5,2),
    quality_score NUMERIC(5,2),
    delivery_score NUMERIC(5,2),
    service_score NUMERIC(5,2),
    price_score NUMERIC(5,2),
    comments TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 合同管理表 ====================

-- 供应商合同表
CREATE TABLE IF NOT EXISTS supplier_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_no VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES srm.suppliers(id),
    supplier_name VARCHAR(200),
    title VARCHAR(200) NOT NULL,
    contract_type VARCHAR(50) NOT NULL,
    total_amount NUMERIC(15,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    sign_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 合同条款表
CREATE TABLE IF NOT EXISTS contract_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES srm.supplier_contracts(id),
    term_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 产品管理表 ====================

-- 供应商产品表
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_no VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES srm.suppliers(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    unit VARCHAR(20),
    unit_price NUMERIC(10,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    min_order_qty INTEGER,
    lead_time_days INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    specifications TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 采购订单表 ====================

-- 采购订单表
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_no VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES srm.suppliers(id),
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_date TIMESTAMPTZ,
    actual_date TIMESTAMPTZ,
    total_amount NUMERIC(15,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 审计日志表 ====================

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent VARCHAR(200),
    organization_id UUID
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_suppliers_no ON srm.suppliers(supplier_no);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON srm.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON srm.suppliers(category);
CREATE INDEX IF NOT EXISTS idx_supplier_categories_no ON srm.supplier_categories(category_no);
CREATE INDEX IF NOT EXISTS idx_supplier_categories_parent ON srm.supplier_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_supplier ON srm.supplier_evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_no ON srm.supplier_evaluations(evaluation_no);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_no ON srm.supplier_contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier ON srm.supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_status ON srm.supplier_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contract_terms_contract ON srm.contract_terms(contract_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_no ON srm.supplier_products(product_no);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON srm.supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_no ON srm.purchase_orders(po_no);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON srm.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON srm.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON srm.audit_logs(record_id);

-- Reset search path
RESET search_path;