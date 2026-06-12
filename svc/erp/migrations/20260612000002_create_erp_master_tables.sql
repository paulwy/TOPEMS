-- ERP模块主数据表创建
-- 期初余额表
CREATE TABLE IF NOT EXISTS erp.opening_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(200) NOT NULL,
    period VARCHAR(6) NOT NULL,
    debit_balance DECIMAL(20,4) DEFAULT 0,
    credit_balance DECIMAL(20,4) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opening_balances_company_period ON erp.opening_balances(company_id, period);
CREATE UNIQUE INDEX IF NOT EXISTS idx_opening_balances_unique ON erp.opening_balances(company_id, subject_code, period);

-- 固定资产表
CREATE TABLE IF NOT EXISTS erp.fixed_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(200) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    asset_category VARCHAR(100),
    purchase_date DATE NOT NULL,
    original_value DECIMAL(20,4) NOT NULL,
    accumulated_depreciation DECIMAL(20,4) DEFAULT 0,
    net_value DECIMAL(20,4) GENERATED ALWAYS AS (original_value - accumulated_depreciation) STORED,
    depreciation_method VARCHAR(50) NOT NULL DEFAULT 'straight_line',
    expected_life INT NOT NULL DEFAULT 36,
    salvage_value DECIMAL(20,4) DEFAULT 0,
    monthly_depreciation DECIMAL(20,4) GENERATED ALWAYS AS ((original_value - salvage_value) / expected_life) STORED,
    location VARCHAR(200),
    responsible_id UUID,
    department_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_code ON erp.fixed_assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON erp.fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_department ON erp.fixed_assets(department_id);

-- 固定资产折旧记录表
CREATE TABLE IF NOT EXISTS erp.asset_depreciation_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES erp.fixed_assets(id) ON DELETE CASCADE,
    period VARCHAR(6) NOT NULL,
    depreciation_amount DECIMAL(20,4) NOT NULL,
    accumulated_depreciation DECIMAL(20,4) NOT NULL,
    voucher_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_depreciation_asset_period ON erp.asset_depreciation_records(asset_id, period);

-- 银行账户表
CREATE TABLE IF NOT EXISTS erp.bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    branch_name VARCHAR(200),
    account_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_type VARCHAR(20) NOT NULL DEFAULT 'general',
    balance DECIMAL(20,4) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'CNY',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON erp.bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_number ON erp.bank_accounts(account_number);

-- 银行交易记录表
CREATE TABLE IF NOT EXISTS erp.bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES erp.bank_accounts(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(20,4) NOT NULL,
    balance_after DECIMAL(20,4) NOT NULL,
    description VARCHAR(500),
    counterparty_account VARCHAR(50),
    counterparty_name VARCHAR(200),
    voucher_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_date ON erp.bank_transactions(account_id, transaction_date);

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要自动更新时间戳的表创建触发器
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_opening_balances_updated_at') THEN
        CREATE TRIGGER trigger_opening_balances_updated_at
        BEFORE UPDATE ON erp.opening_balances
        FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_fixed_assets_updated_at') THEN
        CREATE TRIGGER trigger_fixed_assets_updated_at
        BEFORE UPDATE ON erp.fixed_assets
        FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_bank_accounts_updated_at') THEN
        CREATE TRIGGER trigger_bank_accounts_updated_at
        BEFORE UPDATE ON erp.bank_accounts
        FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;