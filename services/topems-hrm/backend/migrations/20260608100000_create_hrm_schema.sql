-- TOPEMS HRM 数据库迁移脚本
-- 创建人力资源管理相关的表结构

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建 HRM schema
CREATE SCHEMA IF NOT EXISTS hrm;

-- ============================================
-- 1. 公司表 (companies)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    address TEXT,
    contact_phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(255),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_companies_organization_id ON hrm.companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON hrm.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_name ON hrm.companies(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_registration_number ON hrm.companies(registration_number) WHERE deleted_at IS NULL;

COMMENT ON TABLE hrm.companies IS '公司信息表';
COMMENT ON COLUMN hrm.companies.organization_id IS '组织ID，用于多组织隔离';
COMMENT ON COLUMN hrm.companies.deleted_at IS '软删除时间戳';

-- ============================================
-- 2. 部门表 (departments)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    company_id UUID REFERENCES hrm.companies(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    parent_id UUID REFERENCES hrm.departments(id) ON DELETE SET NULL,
    manager_id UUID,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON hrm.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON hrm.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON hrm.departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON hrm.departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON hrm.departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_code ON hrm.departments(code);

COMMENT ON TABLE hrm.departments IS '部门信息表';
COMMENT ON COLUMN hrm.departments.parent_id IS '上级部门ID';
COMMENT ON COLUMN hrm.departments.manager_id IS '部门负责人ID（关联员工表）';

-- ============================================
-- 3. 职位表 (positions)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    department_id UUID REFERENCES hrm.departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    level INTEGER DEFAULT 1,
    description TEXT,
    responsibilities TEXT,
    requirements TEXT,
    salary_range_min NUMERIC(15, 2),
    salary_range_max NUMERIC(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_positions_organization_id ON hrm.positions(organization_id);
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON hrm.positions(department_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON hrm.positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_code ON hrm.positions(code);
CREATE INDEX IF NOT EXISTS idx_positions_level ON hrm.positions(level);

COMMENT ON TABLE hrm.positions IS '职位信息表';

-- ============================================
-- 4. 员工表 (employees)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    company_id UUID REFERENCES hrm.companies(id) ON DELETE SET NULL,
    department_id UUID REFERENCES hrm.departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES hrm.positions(id) ON DELETE SET NULL,
    employee_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    birth_date DATE,
    hire_date DATE,
    leave_date DATE,
    id_card_number VARCHAR(50),
    job_title VARCHAR(255),
    position VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(50),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    address TEXT,
    education VARCHAR(50),
    marital_status VARCHAR(20),
    nationality VARCHAR(50),
    bank_account VARCHAR(100),
    bank_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON hrm.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON hrm.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON hrm.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON hrm.employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON hrm.employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_status ON hrm.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_name ON hrm.employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON hrm.employees(hire_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_number_unique ON hrm.employees(employee_number, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE hrm.employees IS '员工信息表';
COMMENT ON COLUMN hrm.employees.employee_number IS '员工编号，组织内唯一';

-- ============================================
-- 5. 合同表 (contracts)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES hrm.employees(id) ON DELETE CASCADE,
    contract_no VARCHAR(100),
    contract_type VARCHAR(50) NOT NULL,
    party_a_name VARCHAR(255),
    party_a_contact VARCHAR(255),
    party_b_name VARCHAR(255),
    party_b_contact VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    salary NUMERIC(15, 2),
    probation_period_days INTEGER,
    contract_file_path TEXT,
    reminder_days INTEGER DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contracts_organization_id ON hrm.contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employee_id ON hrm.contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON hrm.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON hrm.contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON hrm.contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON hrm.contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_no ON hrm.contracts(contract_no);

COMMENT ON TABLE hrm.contracts IS '员工合同表';
COMMENT ON COLUMN hrm.contracts.contract_type IS '合同类型：full_time, part_time, contractor, intern等';
COMMENT ON COLUMN hrm.contracts.reminder_days IS '合同到期提醒天数';

-- ============================================
-- 6. 考勤表 (attendance_records)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES hrm.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    check_in_location VARCHAR(255),
    check_out_location VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'normal',
    work_hours NUMERIC(5, 2),
    overtime_hours NUMERIC(5, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_attendance_organization_id ON hrm.attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON hrm.attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON hrm.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON hrm.attendance_records(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_employee_date ON hrm.attendance_records(employee_id, date) WHERE deleted_at IS NULL;

COMMENT ON TABLE hrm.attendance_records IS '考勤记录表';
COMMENT ON COLUMN hrm.attendance_records.status IS '考勤状态：normal, late, early_leave, absent, leave等';

-- ============================================
-- 7. 薪资表 (payroll_records)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES hrm.employees(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    base_salary NUMERIC(15, 2) NOT NULL,
    bonus NUMERIC(15, 2) DEFAULT 0,
    allowance NUMERIC(15, 2) DEFAULT 0,
    overtime_pay NUMERIC(15, 2) DEFAULT 0,
    deduction NUMERIC(15, 2) DEFAULT 0,
    tax NUMERIC(15, 2) DEFAULT 0,
    insurance NUMERIC(15, 2) DEFAULT 0,
    net_salary NUMERIC(15, 2) NOT NULL,
    payment_date DATE,
    payment_method VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payroll_organization_id ON hrm.payroll_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON hrm.payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON hrm.payroll_records(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON hrm.payroll_records(status);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_date ON hrm.payroll_records(payment_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_employee_period ON hrm.payroll_records(employee_id, period_year, period_month) WHERE deleted_at IS NULL;

COMMENT ON TABLE hrm.payroll_records IS '薪资记录表';
COMMENT ON COLUMN hrm.payroll_records.status IS '薪资状态：pending, approved, paid等';

-- ============================================
-- 8. 绩效表 (performance_records)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.performance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES hrm.employees(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_month INTEGER,
    period_quarter INTEGER,
    performance_type VARCHAR(50) NOT NULL,
    score NUMERIC(5, 2),
    level VARCHAR(50),
    goals TEXT,
    achievements TEXT,
    strengths TEXT,
    weaknesses TEXT,
    improvement_plan TEXT,
    reviewer_id UUID REFERENCES hrm.employees(id) ON DELETE SET NULL,
    review_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_performance_organization_id ON hrm.performance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_employee_id ON hrm.performance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_period ON hrm.performance_records(period_year, period_month, period_quarter);
CREATE INDEX IF NOT EXISTS idx_performance_type ON hrm.performance_records(performance_type);
CREATE INDEX IF NOT EXISTS idx_performance_status ON hrm.performance_records(status);
CREATE INDEX IF NOT EXISTS idx_performance_reviewer_id ON hrm.performance_records(reviewer_id);

COMMENT ON TABLE hrm.performance_records IS '绩效记录表';
COMMENT ON COLUMN hrm.performance_records.performance_type IS '绩效类型：monthly, quarterly, annual等';

-- ============================================
-- 9. 培训表 (training_records)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    training_name VARCHAR(255) NOT NULL,
    training_type VARCHAR(50),
    training_category VARCHAR(50),
    description TEXT,
    instructor VARCHAR(255),
    start_date DATE,
    end_date DATE,
    duration_hours NUMERIC(5, 2),
    location VARCHAR(255),
    cost NUMERIC(15, 2),
    max_participants INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'planned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_training_organization_id ON hrm.training_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_status ON hrm.training_records(status);
CREATE INDEX IF NOT EXISTS idx_training_type ON hrm.training_records(training_type);
CREATE INDEX IF NOT EXISTS idx_training_start_date ON hrm.training_records(start_date);

COMMENT ON TABLE hrm.training_records IS '培训记录表';

-- ============================================
-- 培训参与表 (training_participants)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.training_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    training_id UUID NOT NULL REFERENCES hrm.training_records(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES hrm.employees(id) ON DELETE CASCADE,
    participation_status VARCHAR(20) NOT NULL DEFAULT 'registered',
    completion_status VARCHAR(20),
    score NUMERIC(5, 2),
    certificate_no VARCHAR(100),
    certificate_file_path TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_training_participants_organization_id ON hrm.training_participants(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_training_id ON hrm.training_participants(training_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_employee_id ON hrm.training_participants(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_participants_status ON hrm.training_participants(participation_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_participants_unique ON hrm.training_participants(training_id, employee_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE hrm.training_participants IS '培训参与记录表';

-- ============================================
-- 10. 招聘表 (recruitment_records)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.recruitment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    position_id UUID REFERENCES hrm.positions(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    salary_range_min NUMERIC(15, 2),
    salary_range_max NUMERIC(15, 2),
    location VARCHAR(255),
    recruitment_type VARCHAR(50),
    publish_date DATE,
    deadline DATE,
    vacancies INTEGER DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recruitment_organization_id ON hrm.recruitment_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_position_id ON hrm.recruitment_records(position_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_status ON hrm.recruitment_records(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_publish_date ON hrm.recruitment_records(publish_date);

COMMENT ON TABLE hrm.recruitment_records IS '招聘记录表';

-- ============================================
-- 招聘申请表 (recruitment_applications)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.recruitment_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    recruitment_id UUID NOT NULL REFERENCES hrm.recruitment_records(id) ON DELETE CASCADE,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(100),
    applicant_phone VARCHAR(50),
    resume_file_path TEXT,
    education VARCHAR(255),
    work_experience TEXT,
    expected_salary NUMERIC(15, 2),
    application_date DATE NOT NULL,
    interview_date DATE,
    interview_result VARCHAR(50),
    offer_status VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recruitment_applications_organization_id ON hrm.recruitment_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_recruitment_id ON hrm.recruitment_applications(recruitment_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_status ON hrm.recruitment_applications(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_application_date ON hrm.recruitment_applications(application_date);

COMMENT ON TABLE hrm.recruitment_applications IS '招聘申请表';

-- ============================================
-- 11. 请假表 (leave_records)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.leave_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES hrm.employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC(5, 2) NOT NULL,
    reason TEXT,
    approver_id UUID REFERENCES hrm.employees(id) ON DELETE SET NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approval_date DATE,
    rejection_reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leave_organization_id ON hrm.leave_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_employee_id ON hrm.leave_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_type ON hrm.leave_records(leave_type);
CREATE INDEX IF NOT EXISTS idx_leave_status ON hrm.leave_records(status);
CREATE INDEX IF NOT EXISTS idx_leave_approval_status ON hrm.leave_records(approval_status);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON hrm.leave_records(start_date, end_date);

COMMENT ON TABLE hrm.leave_records IS '请假记录表';
COMMENT ON COLUMN hrm.leave_records.leave_type IS '请假类型：annual, sick, personal, maternity等';

-- ============================================
-- 12. 薪资调整表 (salary_adjustments)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.salary_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES hrm.employees(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(50) NOT NULL,
    previous_salary NUMERIC(15, 2) NOT NULL,
    new_salary NUMERIC(15, 2) NOT NULL,
    adjustment_amount NUMERIC(15, 2) NOT NULL,
    adjustment_percentage NUMERIC(5, 2),
    effective_date DATE NOT NULL,
    reason TEXT,
    approver_id UUID REFERENCES hrm.employees(id) ON DELETE SET NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approval_date DATE,
    rejection_reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_salary_adjustments_organization_id ON hrm.salary_adjustments(organization_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_employee_id ON hrm.salary_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_type ON hrm.salary_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_status ON hrm.salary_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_effective_date ON hrm.salary_adjustments(effective_date);

COMMENT ON TABLE hrm.salary_adjustments IS '薪资调整记录表';
COMMENT ON COLUMN hrm.salary_adjustments.adjustment_type IS '调整类型：promotion, annual_raise, performance_raise等';

-- ============================================
-- 13. 审计日志表 (audit_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS hrm.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON hrm.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON hrm.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON hrm.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON hrm.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON hrm.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON hrm.audit_logs(created_at DESC);

COMMENT ON TABLE hrm.audit_logs IS '审计日志表';

-- ============================================
-- 插入默认数据（种子数据）
-- ============================================

-- 插入默认公司（示例）
INSERT INTO hrm.companies (id, organization_id, name, short_name, registration_number, status)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'TOPEMS科技有限公司', 'TOPEMS', 'REG001', 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'TOPEMS研究院', '研究院', 'REG002', 'active')
ON CONFLICT DO NOTHING;

-- 插入默认部门（示例）
INSERT INTO hrm.departments (id, organization_id, name, code, status)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '人力资源部', 'HR', 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '技术部', 'TECH', 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '财务部', 'FIN', 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '市场部', 'MARKET', 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '研发部', 'RD', 'active')
ON CONFLICT DO NOTHING;

-- 插入默认职位（示例）
INSERT INTO hrm.positions (id, organization_id, name, code, level, status)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '软件工程师', 'SE', 3, 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '高级软件工程师', 'SSE', 4, 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '技术经理', 'TM', 5, 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '人事专员', 'HR_SPEC', 2, 'active'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '财务专员', 'FIN_SPEC', 2, 'active')
ON CONFLICT DO NOTHING;

-- ============================================
-- 创建更新时间触发器函数
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表创建更新时间触发器
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'hrm' AND tablename != 'audit_logs'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_updated_at_trigger ON hrm.%I', table_name);
        EXECUTE format('CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON hrm.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', table_name);
    END LOOP;
END;
$$;