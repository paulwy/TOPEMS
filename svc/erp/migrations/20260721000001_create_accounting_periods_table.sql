-- ERP 会计期间表
-- 支持真实开/关账管理

CREATE TABLE IF NOT EXISTS erp.accounting_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(20) NOT NULL,  -- YYYYMM
    year INT NOT NULL,
    month INT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',  -- open/closed/closing
    fiscal_year VARCHAR(10) NOT NULL,  -- 财年，如 2026
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    UNIQUE(period, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_accounting_periods_tenant ON erp.accounting_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_status ON erp.accounting_periods(status);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_year ON erp.accounting_periods(year);

-- 不做 seed，让业务运行时按需创建期间（避免 tenant_id 不确定问题）
