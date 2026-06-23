-- 创建财务核心模块表结构

-- 创建枚举类型（使用 DO 块来检查类型是否存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
        CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense', 'cost');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_type') THEN
        CREATE TYPE voucher_type AS ENUM ('general', 'payment', 'receipt', 'transfer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_status') THEN
        CREATE TYPE voucher_status AS ENUM ('draft', 'submitted', 'approved', 'posted', 'rejected', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_status') THEN
        CREATE TYPE period_status AS ENUM ('open', 'closing', 'closed');
    END IF;
END $$;

-- 会计科目表
CREATE TABLE IF NOT EXISTS core_finance_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES core_finance_accounts(id),
    account_type account_type NOT NULL,
    level INT NOT NULL DEFAULT 1,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_account_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_account_tenant_id ON core_finance_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_account_parent_id ON core_finance_accounts(parent_id);

-- 凭证主表
CREATE TABLE IF NOT EXISTS core_finance_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    voucher_no VARCHAR(50) NOT NULL,
    voucher_date TIMESTAMPTZ NOT NULL,
    period VARCHAR(6) NOT NULL,
    voucher_type voucher_type NOT NULL,
    total_debit NUMERIC(18,4) NOT NULL DEFAULT 0,
    total_credit NUMERIC(18,4) NOT NULL DEFAULT 0,
    status voucher_status NOT NULL DEFAULT 'draft',
    description TEXT,
    created_by VARCHAR(100) NOT NULL,
    approved_by VARCHAR(100),
    posted_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_voucher_tenant_id ON core_finance_vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voucher_period ON core_finance_vouchers(period);
CREATE INDEX IF NOT EXISTS idx_voucher_status ON core_finance_vouchers(status);

-- 凭证明细表
CREATE TABLE IF NOT EXISTS core_finance_voucher_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES core_finance_vouchers(id) ON DELETE CASCADE,
    line_no INT NOT NULL,
    account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    description TEXT,
    debit NUMERIC(18,4) NOT NULL DEFAULT 0,
    credit NUMERIC(18,4) NOT NULL DEFAULT 0,
    project_id UUID,
    department_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_voucher_line_voucher_id ON core_finance_voucher_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_line_account_id ON core_finance_voucher_lines(account_id);

-- 账簿表
CREATE TABLE IF NOT EXISTS core_finance_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    account_id UUID NOT NULL REFERENCES core_finance_accounts(id),
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    voucher_id UUID NOT NULL REFERENCES core_finance_vouchers(id),
    voucher_no VARCHAR(50) NOT NULL,
    voucher_date TIMESTAMPTZ NOT NULL,
    period VARCHAR(6) NOT NULL,
    aux_type VARCHAR(20),
    aux_id UUID,
    description TEXT,
    debit NUMERIC(18,4) NOT NULL DEFAULT 0,
    credit NUMERIC(18,4) NOT NULL DEFAULT 0,
    balance NUMERIC(18,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant_id ON core_finance_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account_id ON core_finance_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_period ON core_finance_ledger(period);
CREATE INDEX IF NOT EXISTS idx_ledger_aux ON core_finance_ledger(aux_type, aux_id);

-- 会计期间表
CREATE TABLE IF NOT EXISTS core_finance_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    year INT NOT NULL,
    month INT NOT NULL,
    period_name VARCHAR(20) NOT NULL,
    status period_status NOT NULL DEFAULT 'open',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    closed_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_period UNIQUE (tenant_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_period_tenant_id ON core_finance_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_period_status ON core_finance_periods(status);
