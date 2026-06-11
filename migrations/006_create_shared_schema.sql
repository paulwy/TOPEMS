-- 创建 shared schema
CREATE SCHEMA IF NOT EXISTS shared;

-- 创建 shared.companies 表
CREATE TABLE IF NOT EXISTS shared.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    address VARCHAR(500),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT '中国',
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    website VARCHAR(500),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建 shared.departments 表
CREATE TABLE IF NOT EXISTS shared.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    company_id UUID REFERENCES shared.companies(id),
    parent_id UUID REFERENCES shared.departments(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    manager_id UUID,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建 shared.employees 表
CREATE TABLE IF NOT EXISTS shared.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    company_id UUID REFERENCES shared.companies(id),
    department_id UUID REFERENCES shared.departments(id),
    position_id UUID,
    employee_number VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    birth_date DATE,
    id_card VARCHAR(18),
    hire_date DATE,
    position VARCHAR(100),
    job_title VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    address VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 创建 shared.users 表（与 IAM 同步）
CREATE TABLE IF NOT EXISTS shared.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES shared.employees(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- 创建 shared.audit_logs 表
CREATE TABLE IF NOT EXISTS shared.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 添加注释
COMMENT ON SCHEMA shared IS '统一共享数据层 - 公司、部门、员工等核心实体';
COMMENT ON TABLE shared.companies IS '统一公司信息表';
COMMENT ON TABLE shared.departments IS '统一部门信息表';
COMMENT ON TABLE shared.employees IS '统一员工信息表';
COMMENT ON TABLE shared.users IS '统一用户信息表（与 IAM.users 同步）';
COMMENT ON TABLE shared.audit_logs IS '统一审计日志表';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_companies_status ON shared.companies(status);
CREATE INDEX IF NOT EXISTS idx_departments_company ON shared.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON shared.departments(status);
CREATE INDEX IF NOT EXISTS idx_employees_company ON shared.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON shared.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON shared.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON shared.employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_users_username ON shared.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON shared.users(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON shared.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON shared.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON shared.audit_logs(created_at);

-- 插入示例数据
INSERT INTO shared.companies (id, name, short_name, contact_phone, status) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'TOPEMS科技集团', 'TOPEMS', '400-888-8888', 'active')
ON CONFLICT (id) DO NOTHING;

SELECT 'Shared schema created successfully!' as result;
