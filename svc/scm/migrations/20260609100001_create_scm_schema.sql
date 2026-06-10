-- SCM Schema Migration
-- 供应链管理系统

-- Create schema
CREATE SCHEMA IF NOT EXISTS scm;

-- Set search path
SET search_path TO scm;

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
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 供应商评估表
CREATE TABLE IF NOT EXISTS supplier_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES scm.suppliers(id),
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

-- ==================== 采购管理表 ====================

-- 采购订单表
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_no VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES scm.suppliers(id),
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

-- 采购明细表
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES scm.purchase_orders(id),
    item_no VARCHAR(50) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    specification VARCHAR(200),
    unit VARCHAR(20),
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    received_quantity NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_suppliers_no ON scm.suppliers(supplier_no);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON scm.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON scm.suppliers(category);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_supplier ON scm.supplier_evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_no ON scm.supplier_evaluations(evaluation_no);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_no ON scm.purchase_orders(po_no);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON scm.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON scm.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_items_order ON scm.purchase_items(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON scm.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON scm.audit_logs(record_id);

-- Reset search path
RESET search_path;