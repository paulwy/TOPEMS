-- 创建 erp schema
CREATE SCHEMA IF NOT EXISTS erp;

-- 创建 companies 表
CREATE TABLE IF NOT EXISTS erp.companies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    address VARCHAR(500),
    contact_phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入示例数据
INSERT INTO erp.companies (id, name, short_name, registration_number, tax_number, address, contact_phone, email, status)
VALUES
    (gen_random_uuid(), '北京天地科技有限公司', '天地科技', '1101010000001', '110000000000', '北京市海淀区中关村大街1号', '010-12345678', 'contact@tdtech.com', 'active'),
    (gen_random_uuid(), '上海创新电子集团', '创新电子', '3101010000001', '310000000000', '上海市浦东新区张江高科技园区', '021-87654321', 'info@innov-e.com', 'active')
ON CONFLICT DO NOTHING;

-- 创建 departments 表
CREATE TABLE IF NOT EXISTS erp.departments (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    parent_id UUID REFERENCES erp.departments(id),
    company_id UUID REFERENCES erp.companies(id),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 employees 表
CREATE TABLE IF NOT EXISTS erp.employees (
    id UUID PRIMARY KEY,
    employee_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    birth_date DATE,
    hire_date DATE,
    department_id UUID REFERENCES erp.departments(id),
    position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 assets 表
CREATE TABLE IF NOT EXISTS erp.assets (
    id UUID PRIMARY KEY,
    asset_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    purchase_date DATE,
    purchase_amount DECIMAL(15,2),
    location VARCHAR(255),
    responsible_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 audit_logs 表
CREATE TABLE IF NOT EXISTS erp.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    user_id UUID,
    request_data JSONB,
    response_data JSONB,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_companies_status ON erp.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_name ON erp.companies(name);
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON erp.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON erp.departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON erp.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON erp.employees(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON erp.audit_logs(entity_type, entity_id);
