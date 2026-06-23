-- ERP 服务的财务相关表迁移脚本
-- 将所有 erp schema 表创建到 public schema

-- 1. 会计科目表
CREATE TABLE IF NOT EXISTS public.accounting_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    level INT DEFAULT 1,
    parent_code VARCHAR(50),
    description TEXT,
    is_cash_flow BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 费用报销表
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(100) NOT NULL UNIQUE,
    applicant_name VARCHAR(200) NOT NULL,
    department_id UUID,
    expense_type VARCHAR(100),
    amount NUMERIC(18,2) NOT NULL,
    description TEXT,
    expense_date TIMESTAMPTZ,
    receipt_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    approver_id UUID,
    approved_at TIMESTAMPTZ,
    reimbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 预算表
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL,
    budget_type VARCHAR(100),
    fiscal_year VARCHAR(20) NOT NULL,
    total_budget NUMERIC(18,2) NOT NULL,
    used_amount NUMERIC(18,2) DEFAULT 0,
    remaining_amount NUMERIC(18,2),
    usage_rate NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 应收账款表
CREATE TABLE IF NOT EXISTS public.receivables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    customer_name VARCHAR(200),
    project_name VARCHAR(200),
    amount NUMERIC(18,2) NOT NULL,
    invoice_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending',
    received_amount NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 应付账款表
CREATE TABLE IF NOT EXISTS public.payables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_name VARCHAR(200),
    category VARCHAR(100),
    amount NUMERIC(18,2) NOT NULL,
    invoice_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending',
    paid_amount NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_code ON public.accounting_subjects(code);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_budgets_department_id ON public.budgets(department_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON public.receivables(status);
CREATE INDEX IF NOT EXISTS idx_payables_status ON public.payables(status);

-- 授予权限
GRANT ALL ON ALL TABLES IN SCHEMA public TO topems;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO topems;
