-- BE-09 P0: expense-approvals 接真表（消除后端空壳假成功）
-- 对齐前端 expenseApproval.ts:8-28 ExpenseApproval 契约字段

CREATE TABLE IF NOT EXISTS "finance"."expense_approvals" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_no VARCHAR(64) NOT NULL,
    employee_id UUID,
    employee_name VARCHAR(128),
    department VARCHAR(128),
    expense_date DATE NOT NULL,
    expense_type VARCHAR(64),
    total_amount DECIMAL(18,2) DEFAULT 0,
    status VARCHAR(32) DEFAULT 'pending',
    description TEXT,
    approver_id UUID,
    approver_name VARCHAR(128),
    approval_note TEXT,
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- RLS: 应用层 tenant 过滤（与 budgets/expenses 同范式）
CREATE INDEX IF NOT EXISTS idx_expense_approvals_tenant ON "finance"."expense_approvals"(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_approvals_status ON "finance"."expense_approvals"(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_approvals_expense_no ON "finance"."expense_approvals"(expense_no) WHERE deleted_at IS NULL;
