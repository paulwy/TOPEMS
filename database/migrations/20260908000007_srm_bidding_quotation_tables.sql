-- ================================================================================
-- SRM 缺表补齐：模块代码引用的 4 张表从未建过（biddings/quotations/scoring_dimensions/bidding_suppliers）
-- 2026-09-08：修复 srm 模块 plugin_srm.* -> srm.* 错位时发现
-- 列定义提取自 svc/srm/src/modules/{bidding,quotation,scoring_dimension}.rs 的 INSERT/RETURNING
-- 与 schema_defense.rs TABLE_DEFS 设计一致（单事实源，后续可并入 TABLE_DEFS）
-- ================================================================================
BEGIN;

-- 竞价单
CREATE TABLE IF NOT EXISTS srm.biddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bidding_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    bidding_type VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    budget_amount NUMERIC(18, 2),
    currency VARCHAR(10) DEFAULT 'CNY',
    publish_date TIMESTAMPTZ,
    bid_deadline TIMESTAMPTZ,
    open_date TIMESTAMPTZ,
    winner_supplier_id UUID,
    winner_supplier_name VARCHAR(200),
    winner_amount NUMERIC(18, 2),
    supplier_count INTEGER DEFAULT 0,
    creator UUID,
    department VARCHAR(100),
    items JSONB,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID
);

-- 报价单
CREATE TABLE IF NOT EXISTS srm.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_no VARCHAR(50) NOT NULL UNIQUE,
    inquiry_id UUID,
    inquiry_no VARCHAR(50),
    supplier_id UUID,
    supplier_name VARCHAR(200),
    title VARCHAR(200),
    total_amount NUMERIC(18, 2),
    currency VARCHAR(10) DEFAULT 'CNY',
    valid_until TIMESTAMPTZ,
    delivery_time VARCHAR(100),
    payment_terms TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    items JSONB,
    remarks TEXT,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID
);

-- 评分维度
CREATE TABLE IF NOT EXISTS srm.scoring_dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    weight NUMERIC(5, 2) DEFAULT 0,
    min_score NUMERIC(10, 2),
    max_score NUMERIC(10, 2),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 竞价-供应商关联
CREATE TABLE IF NOT EXISTS srm.bidding_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bidding_id UUID NOT NULL REFERENCES srm.biddings(id),
    supplier_id UUID NOT NULL REFERENCES srm.suppliers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID
);

CREATE INDEX IF NOT EXISTS idx_srm_biddings_status ON srm.biddings(status);
CREATE INDEX IF NOT EXISTS idx_srm_biddings_tenant ON srm.biddings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_srm_quotations_inquiry ON srm.quotations(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_srm_quotations_tenant ON srm.quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_srm_bidding_suppliers_bidding ON srm.bidding_suppliers(bidding_id);
CREATE INDEX IF NOT EXISTS idx_srm_bidding_suppliers_supplier ON srm.bidding_suppliers(supplier_id);

COMMIT;
