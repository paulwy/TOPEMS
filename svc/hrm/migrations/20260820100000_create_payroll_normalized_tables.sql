-- ============================================
-- 薪资发放规范化表 (payroll_runs / payroll_items / payroll_details)
-- 补齐 payroll.rs 模块所需的 3 张表（与已有 hrm.payroll_records 并存）
-- ============================================

-- ============================================
-- 1. 薪资发放批次 (payroll_runs)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    tenant_id UUID,
    pay_period VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    employee_count INTEGER NOT NULL DEFAULT 0,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_organization_id ON hrm.payroll_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_id ON hrm.payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_pay_period ON hrm.payroll_runs(pay_period);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON hrm.payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_paid_at ON hrm.payroll_runs(paid_at);

COMMENT ON TABLE hrm.payroll_runs IS '薪资发放批次表';
COMMENT ON COLUMN hrm.payroll_runs.pay_period IS '薪资周期（YYYY-MM）';
COMMENT ON COLUMN hrm.payroll_runs.status IS '批次状态：draft, calculated, paid';

-- ============================================
-- 2. 薪资发放明细 (payroll_items)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID NOT NULL REFERENCES hrm.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    gross_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    taxes NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    bank_account VARCHAR(50),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_run_id ON hrm.payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_id ON hrm.payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_status ON hrm.payroll_items(status);

COMMENT ON TABLE hrm.payroll_items IS '薪资发放明细表（按员工）';
COMMENT ON COLUMN hrm.payroll_items.status IS '明细状态：pending, paid';

-- ============================================
-- 3. 薪资发放详情 (payroll_details)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.payroll_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_item_id UUID NOT NULL REFERENCES hrm.payroll_items(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_details_item_id ON hrm.payroll_details(payroll_item_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_type ON hrm.payroll_details(item_type);

COMMENT ON TABLE hrm.payroll_details IS '薪资发放详情表（奖金/扣款等）';
