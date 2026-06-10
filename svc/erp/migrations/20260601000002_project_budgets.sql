-- 项目预算表
CREATE TABLE IF NOT EXISTS project_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    budget_type VARCHAR(50) NOT NULL DEFAULT 'EXPENSE',
    fiscal_year VARCHAR(4) NOT NULL,
    total_budget NUMERIC(18,2) NOT NULL,
    allocated_amount NUMERIC(18,2) DEFAULT 0,
    used_amount NUMERIC(18,2) DEFAULT 0,
    remaining_amount NUMERIC(18,2) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_by VARCHAR(100) NOT NULL,
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目预算明细项表
CREATE TABLE IF NOT EXISTS project_budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES project_budgets(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    budget_amount NUMERIC(18,2) NOT NULL,
    used_amount NUMERIC(18,2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_status ON project_budgets(status);
CREATE INDEX IF NOT EXISTS idx_project_budget_items_budget_id ON project_budget_items(budget_id);