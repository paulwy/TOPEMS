-- 财务报表快照表（用于 financialReport API）
CREATE TABLE IF NOT EXISTS financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(32) NOT NULL,  -- balance_sheet | income_statement | cash_flow
    company_id UUID,
    tenant_id UUID NOT NULL,
    period VARCHAR(16) NOT NULL,       -- YYYY-MM
    compare_period VARCHAR(16),
    currency_code VARCHAR(8) DEFAULT 'CNY',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',  -- draft | pending | approved | rejected | locked
    approval_status VARCHAR(32) NOT NULL DEFAULT 'draft',
    data JSONB NOT NULL DEFAULT '{}',
    rejection_reason TEXT,
    approval_comment TEXT,
    generated_by VARCHAR(128),
    approved_by VARCHAR(128),
    generated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(report_type, company_id, period, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_financial_reports_tenant_id ON financial_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_company_id ON financial_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_report_type ON financial_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_period ON financial_reports(period);
CREATE INDEX IF NOT EXISTS idx_financial_reports_status ON financial_reports(status);
