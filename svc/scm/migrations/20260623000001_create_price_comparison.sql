-- SCM 采购比价功能扩展
-- 新增采购询价单和比价分析表

SET search_path TO scm;

-- 采购询价单表
CREATE TABLE IF NOT EXISTS purchase_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    inquiry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 采购询价明细表
CREATE TABLE IF NOT EXISTS purchase_inquiry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES purchase_inquiries(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    specification VARCHAR(200),
    unit VARCHAR(20),
    quantity NUMERIC(10,2) NOT NULL,
    target_price NUMERIC(10,2),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 供应商报价表
CREATE TABLE IF NOT EXISTS supplier_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES purchase_inquiries(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    quote_no VARCHAR(50) NOT NULL UNIQUE,
    quote_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(15,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    delivery_days INTEGER,
    valid_until TIMESTAMPTZ,
    payment_terms VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 供应商报价明细表
CREATE TABLE IF NOT EXISTS supplier_quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,
    inquiry_item_id UUID NOT NULL REFERENCES purchase_inquiry_items(id),
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(15,2) NOT NULL,
    lead_time_days INTEGER,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 比价分析表
CREATE TABLE IF NOT EXISTS price_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES purchase_inquiries(id) ON DELETE CASCADE,
    comparison_no VARCHAR(50) NOT NULL UNIQUE,
    compared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recommended_supplier_id UUID REFERENCES suppliers(id),
    recommended_quote_id UUID REFERENCES supplier_quotes(id),
    total_score NUMERIC(5,2),
    quality_score NUMERIC(5,2),
    price_score NUMERIC(5,2),
    delivery_score NUMERIC(5,2),
    service_score NUMERIC(5,2),
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 比价分析明细表
CREATE TABLE IF NOT EXISTS price_comparison_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comparison_id UUID NOT NULL REFERENCES price_comparisons(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    quote_id UUID NOT NULL REFERENCES supplier_quotes(id),
    quality_score NUMERIC(5,2),
    price_score NUMERIC(5,2),
    delivery_score NUMERIC(5,2),
    service_score NUMERIC(5,2),
    total_score NUMERIC(5,2),
    rank INTEGER,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_purchase_inquiries_no ON purchase_inquiries(inquiry_no);
CREATE INDEX IF NOT EXISTS idx_purchase_inquiries_status ON purchase_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_purchase_inquiry_items_inquiry ON purchase_inquiry_items(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_inquiry ON supplier_quotes(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_supplier ON supplier_quotes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_no ON supplier_quotes(quote_no);
CREATE INDEX IF NOT EXISTS idx_supplier_quote_items_quote ON supplier_quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_price_comparisons_inquiry ON price_comparisons(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_price_comparisons_no ON price_comparisons(comparison_no);
CREATE INDEX IF NOT EXISTS idx_price_comparison_items_comparison ON price_comparison_items(comparison_id);

RESET search_path;
