-- 合并报表数据库迁移脚本
-- 创建合并报表相关表

-- ==================== 合并范围表 ====================
CREATE TABLE IF NOT EXISTS erp.consolidation_scopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    consolidation_method VARCHAR(20) NOT NULL DEFAULT 'full',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- ==================== 合并范围公司表 ====================
CREATE TABLE IF NOT EXISTS erp.consolidation_scope_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope_id UUID NOT NULL REFERENCES erp.consolidation_scopes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    company_code VARCHAR(50),
    company_name VARCHAR(200),
    is_parent BOOLEAN NOT NULL DEFAULT FALSE,
    control_type VARCHAR(20) NOT NULL DEFAULT 'full_control',
    ownership_percentage NUMERIC(10, 4) NOT NULL DEFAULT 0,
    consolidation_percentage NUMERIC(10, 4) NOT NULL DEFAULT 100,
    minority_interest NUMERIC(20, 2) NOT NULL DEFAULT 0,
    effective_date DATE,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 抵消规则表 ====================
CREATE TABLE IF NOT EXISTS erp.elimination_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope_id UUID NOT NULL REFERENCES erp.consolidation_scopes(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    direction VARCHAR(20) NOT NULL DEFAULT 'both',
    debit_account_codes JSONB,
    credit_account_codes JSONB,
    company_pairs JSONB,
    auto_elimination BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 内部交易表 ====================
CREATE TABLE IF NOT EXISTS erp.internal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    transaction_no VARCHAR(50) NOT NULL UNIQUE,
    transaction_date DATE NOT NULL,
    period VARCHAR(7) NOT NULL,
    from_company_id UUID NOT NULL,
    from_company_name VARCHAR(200),
    to_company_id UUID NOT NULL,
    to_company_name VARCHAR(200),
    transaction_type VARCHAR(50) NOT NULL,
    description TEXT,
    amount NUMERIC(20, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    elimination_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    eliminated_amount NUMERIC(20, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(20, 2) NOT NULL DEFAULT 0,
    voucher_id UUID,
    elimination_voucher_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 合并报表表 ====================
CREATE TABLE IF NOT EXISTS erp.consolidation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    report_no VARCHAR(50) NOT NULL UNIQUE,
    report_type VARCHAR(50) NOT NULL,
    scope_id UUID NOT NULL REFERENCES erp.consolidation_scopes(id),
    scope_name VARCHAR(200),
    period VARCHAR(7) NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER,
    month INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    company_count INTEGER NOT NULL DEFAULT 0,
    eliminated_company_count INTEGER NOT NULL DEFAULT 0,
    total_assets NUMERIC(20, 2),
    total_liabilities NUMERIC(20, 2),
    total_equity NUMERIC(20, 2),
    total_revenue NUMERIC(20, 2),
    total_profit NUMERIC(20, 2),
    net_profit NUMERIC(20, 2),
    minority_interest NUMERIC(20, 2),
    parent_net_profit NUMERIC(20, 2),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    published_by UUID,
    published_at TIMESTAMPTZ,
    generated_by UUID,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 合并报表行项目表 ====================
CREATE TABLE IF NOT EXISTS erp.consolidation_report_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES erp.consolidation_reports(id) ON DELETE CASCADE,
    line_no INTEGER NOT NULL,
    item_code VARCHAR(50),
    item_name VARCHAR(200) NOT NULL,
    item_level INTEGER NOT NULL DEFAULT 1,
    current_period NUMERIC(20, 2) NOT NULL DEFAULT 0,
    prior_period NUMERIC(20, 2),
    company_breakdown JSONB,
    elimination_breakdown JSONB,
    formula TEXT,
    notes TEXT
);

-- ==================== 公司关系表 ====================
CREATE TABLE IF NOT EXISTS erp.company_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    parent_company_id UUID NOT NULL,
    parent_company_name VARCHAR(200),
    child_company_id UUID NOT NULL,
    child_company_name VARCHAR(200),
    relation_type VARCHAR(20) NOT NULL,
    ownership_percentage NUMERIC(10, 4) NOT NULL DEFAULT 0,
    control_percentage NUMERIC(10, 4) NOT NULL DEFAULT 0,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 索引 ====================
CREATE INDEX IF NOT EXISTS idx_consolidation_scopes_code ON erp.consolidation_scopes(code);
CREATE INDEX IF NOT EXISTS idx_consolidation_scopes_status ON erp.consolidation_scopes(status);
CREATE INDEX IF NOT EXISTS idx_consolidation_scope_companies_scope_id ON erp.consolidation_scope_companies(scope_id);
CREATE INDEX IF NOT EXISTS idx_elimination_rules_scope_id ON erp.elimination_rules(scope_id);
CREATE INDEX IF NOT EXISTS idx_elimination_rules_code ON erp.elimination_rules(code);
CREATE INDEX IF NOT EXISTS idx_internal_transactions_period ON erp.internal_transactions(period);
CREATE INDEX IF NOT EXISTS idx_internal_transactions_elimination_status ON erp.internal_transactions(elimination_status);
CREATE INDEX IF NOT EXISTS idx_consolidation_reports_scope_id ON erp.consolidation_reports(scope_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_reports_period ON erp.consolidation_reports(period);
CREATE INDEX IF NOT EXISTS idx_consolidation_reports_no ON erp.consolidation_reports(report_no);
CREATE INDEX IF NOT EXISTS idx_consolidation_report_lines_report_id ON erp.consolidation_report_lines(report_id);
CREATE INDEX IF NOT EXISTS idx_company_relations_parent ON erp.company_relations(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_company_relations_child ON erp.company_relations(child_company_id);
