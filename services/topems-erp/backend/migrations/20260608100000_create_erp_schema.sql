-- ERP 服务数据库迁移脚本
-- 创建 erp schema
CREATE SCHEMA IF NOT EXISTS erp;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== 资产表 ====================
CREATE TABLE IF NOT EXISTS erp.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    asset_number VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    purchase_date TIMESTAMPTZ,
    purchase_amount NUMERIC(15,2),
    location VARCHAR(255),
    responsible_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'in_use',
    serial_number VARCHAR(100),
    manufacturer VARCHAR(200),
    rated_power NUMERIC(10,2),
    rated_voltage NUMERIC(10,2),
    rated_current NUMERIC(10,2),
    specifications JSONB,
    image_url VARCHAR(500),
    department VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 审计日志表 ====================
CREATE TABLE IF NOT EXISTS erp.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_ids JSONB,
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    request_details JSONB,
    response_details JSONB,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    ip_address VARCHAR(255),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 费用报销表 ====================
CREATE TABLE IF NOT EXISTS erp.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(100) NOT NULL UNIQUE,
    applicant_name VARCHAR(255),
    department_id UUID,
    expense_type VARCHAR(100),
    amount NUMERIC(15,2) NOT NULL,
    description TEXT,
    expense_date TIMESTAMPTZ,
    receipt_count INT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approver_id UUID,
    approved_at TIMESTAMPTZ,
    reimbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 预算管理表 ====================
CREATE TABLE IF NOT EXISTS erp.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    department_id UUID,
    budget_type VARCHAR(100),
    fiscal_year VARCHAR(20) NOT NULL,
    total_budget NUMERIC(15,2) NOT NULL,
    used_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(15,2) NOT NULL,
    usage_rate NUMERIC(5,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 应收账款表 ====================
CREATE TABLE IF NOT EXISTS erp.receivables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    customer_name VARCHAR(255),
    project_name VARCHAR(255),
    amount NUMERIC(15,2) NOT NULL,
    invoice_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    received_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 应付账款表 ====================
CREATE TABLE IF NOT EXISTS erp.payables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_name VARCHAR(255),
    category VARCHAR(100),
    amount NUMERIC(15,2) NOT NULL,
    invoice_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 字典类型表 ====================
CREATE TABLE IF NOT EXISTS erp.dict_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 字典项表 ====================
CREATE TABLE IF NOT EXISTS erp.dict_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    dict_type_id UUID NOT NULL REFERENCES erp.dict_types(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    value TEXT,
    sort_order INT DEFAULT 0,
    parent_id UUID REFERENCES erp.dict_items(id),
    extra_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(dict_type_id, code)
);

-- ==================== 数据库变更记录表 ====================
CREATE TABLE IF NOT EXISTS erp.db_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    change_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(200) NOT NULL,
    column_name VARCHAR(200),
    old_definition JSONB,
    new_definition JSONB,
    sql_statement TEXT NOT NULL,
    executed_by VARCHAR(255),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    backup_data JSONB,
    deleted_at TIMESTAMPTZ
);

-- ==================== 会计科目表 ====================
CREATE TABLE IF NOT EXISTS erp.accounting_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    level INT NOT NULL DEFAULT 1,
    parent_code VARCHAR(50),
    description TEXT,
    is_cash_flow BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 财务凭证表 ====================
CREATE TABLE IF NOT EXISTS erp.financial_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    voucher_number VARCHAR(100) NOT NULL,
    voucher_date TIMESTAMPTZ NOT NULL,
    period VARCHAR(20) NOT NULL,
    attachment_count INT DEFAULT 0,
    summary TEXT,
    maker_id UUID,
    maker_name VARCHAR(200),
    checker_id UUID,
    checker_name VARCHAR(200),
    bookkeeper_id UUID,
    bookkeeper_name VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    total_debit NUMERIC(18,4) NOT NULL DEFAULT 0,
    total_credit NUMERIC(18,4) NOT NULL DEFAULT 0,
    source_system VARCHAR(50),
    source_id VARCHAR(100),
    project_id UUID,
    contract_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(voucher_number, period)
);

-- ==================== 凭证明细表 ====================
CREATE TABLE IF NOT EXISTS erp.voucher_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL REFERENCES erp.financial_vouchers(id) ON DELETE CASCADE,
    line_number INT NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(200),
    summary TEXT,
    debit_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
    credit_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
    quantity NUMERIC(15,4),
    unit VARCHAR(50),
    price NUMERIC(15,4),
    department_id UUID,
    project_id UUID,
    contract_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 项目合同表 ====================
CREATE TABLE IF NOT EXISTS erp.project_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(100) NOT NULL UNIQUE,
    project_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    contract_amount NUMERIC(18,2) NOT NULL,
    signed_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    contract_type VARCHAR(100),
    payment_terms TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 项目预算表 ====================
CREATE TABLE IF NOT EXISTS erp.project_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES erp.project_contracts(id) ON DELETE CASCADE,
    budget_type VARCHAR(100),
    fiscal_year VARCHAR(20) NOT NULL,
    total_budget NUMERIC(18,2) NOT NULL,
    used_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(18,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 项目预算明细表 ====================
CREATE TABLE IF NOT EXISTS erp.project_budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES erp.project_budgets(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_category VARCHAR(100),
    budget_amount NUMERIC(18,2) NOT NULL,
    used_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(18,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 付款计划表 ====================
CREATE TABLE IF NOT EXISTS erp.payment_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES erp.project_contracts(id) ON DELETE CASCADE,
    payment_number VARCHAR(100) NOT NULL UNIQUE,
    payment_stage VARCHAR(100),
    scheduled_amount NUMERIC(18,2) NOT NULL,
    scheduled_date TIMESTAMPTZ,
    actual_amount NUMERIC(18,2),
    actual_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 创建索引 ====================

-- 资产表索引
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON erp.assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_number ON erp.assets(asset_number);
CREATE INDEX IF NOT EXISTS idx_assets_category ON erp.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON erp.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON erp.assets(deleted_at);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON erp.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON erp.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON erp.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON erp.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON erp.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON erp.audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_deleted_at ON erp.audit_logs(deleted_at);

-- 费用报销索引
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON erp.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_number ON erp.expenses(expense_number);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON erp.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON erp.expenses(deleted_at);

-- 预算管理索引
CREATE INDEX IF NOT EXISTS idx_budgets_organization_id ON erp.budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON erp.budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON erp.budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON erp.budgets(deleted_at);

-- 应收账款索引
CREATE INDEX IF NOT EXISTS idx_receivables_organization_id ON erp.receivables(organization_id);
CREATE INDEX IF NOT EXISTS idx_receivables_invoice_number ON erp.receivables(invoice_number);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON erp.receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_deleted_at ON erp.receivables(deleted_at);

-- 应付账款索引
CREATE INDEX IF NOT EXISTS idx_payables_organization_id ON erp.payables(organization_id);
CREATE INDEX IF NOT EXISTS idx_payables_invoice_number ON erp.payables(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payables_status ON erp.payables(status);
CREATE INDEX IF NOT EXISTS idx_payables_deleted_at ON erp.payables(deleted_at);

-- 字典类型索引
CREATE INDEX IF NOT EXISTS idx_dict_types_organization_id ON erp.dict_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_dict_types_category ON erp.dict_types(category);
CREATE INDEX IF NOT EXISTS idx_dict_types_status ON erp.dict_types(status);
CREATE INDEX IF NOT EXISTS idx_dict_types_deleted_at ON erp.dict_types(deleted_at);

-- 字典项索引
CREATE INDEX IF NOT EXISTS idx_dict_items_organization_id ON erp.dict_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_dict_items_type ON erp.dict_items(dict_type_id);
CREATE INDEX IF NOT EXISTS idx_dict_items_parent ON erp.dict_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_dict_items_deleted_at ON erp.dict_items(deleted_at);

-- 数据库变更记录索引
CREATE INDEX IF NOT EXISTS idx_db_changes_organization_id ON erp.db_changes(organization_id);
CREATE INDEX IF NOT EXISTS idx_db_changes_table ON erp.db_changes(table_name);
CREATE INDEX IF NOT EXISTS idx_db_changes_time ON erp.db_changes(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_db_changes_deleted_at ON erp.db_changes(deleted_at);

-- 会计科目索引
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_organization_id ON erp.accounting_subjects(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_code ON erp.accounting_subjects(code);
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_parent ON erp.accounting_subjects(parent_code);
CREATE INDEX IF NOT EXISTS idx_accounting_subjects_deleted_at ON erp.accounting_subjects(deleted_at);

-- 财务凭证索引
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_organization_id ON erp.financial_vouchers(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_voucher_number ON erp.financial_vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_period ON erp.financial_vouchers(period);
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_status ON erp.financial_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_deleted_at ON erp.financial_vouchers(deleted_at);

-- 凭证明细索引
CREATE INDEX IF NOT EXISTS idx_voucher_items_organization_id ON erp.voucher_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_voucher_items_voucher_id ON erp.voucher_items(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_items_subject_code ON erp.voucher_items(subject_code);
CREATE INDEX IF NOT EXISTS idx_voucher_items_deleted_at ON erp.voucher_items(deleted_at);

-- 项目合同索引
CREATE INDEX IF NOT EXISTS idx_project_contracts_organization_id ON erp.project_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_contracts_contract_number ON erp.project_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_project_contracts_status ON erp.project_contracts(status);
CREATE INDEX IF NOT EXISTS idx_project_contracts_deleted_at ON erp.project_contracts(deleted_at);

-- 项目预算索引
CREATE INDEX IF NOT EXISTS idx_project_budgets_organization_id ON erp.project_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON erp.project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_deleted_at ON erp.project_budgets(deleted_at);

-- 项目预算明细索引
CREATE INDEX IF NOT EXISTS idx_project_budget_items_organization_id ON erp.project_budget_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_items_budget_id ON erp.project_budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_items_deleted_at ON erp.project_budget_items(deleted_at);

-- 付款计划索引
CREATE INDEX IF NOT EXISTS idx_payment_schedules_organization_id ON erp.payment_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON erp.payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON erp.payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_deleted_at ON erp.payment_schedules(deleted_at);