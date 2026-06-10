-- 收付款计划表
CREATE TABLE IF NOT EXISTS payment_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receivable_id UUID,
    payable_id UUID,
    project_id UUID NOT NULL,
    contract_id UUID,
    schedule_type VARCHAR(50) NOT NULL DEFAULT 'PAY',
    due_date TIMESTAMPTZ NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    actual_payment_date TIMESTAMPTZ,
    actual_amount NUMERIC(18,2),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_project_id ON payment_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);