-- 创建公共Schema用于存储共享主数据
-- 本Schema包含公司、部门、员工等跨模块共享的数据

-- 创建Schema
CREATE SCHEMA IF NOT EXISTS shared;

-- 公司信息表
CREATE TABLE IF NOT EXISTS shared.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(50),
    tax_id VARCHAR(50),
    registered_address VARCHAR(500),
    business_scope TEXT,
    industry VARCHAR(100),
    scale VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON shared.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_status ON shared.companies(status);

-- 部门信息表
CREATE TABLE IF NOT EXISTS shared.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES shared.companies(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES shared.departments(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_company ON shared.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON shared.departments(parent_id);

-- 职位信息表
CREATE TABLE IF NOT EXISTS shared.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES shared.companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    level VARCHAR(20),
    department_id UUID REFERENCES shared.departments(id) ON DELETE SET NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_company ON shared.positions(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_department ON shared.positions(department_id);

-- 员工信息表
CREATE TABLE IF NOT EXISTS shared.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES shared.companies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES shared.departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES shared.positions(id) ON DELETE SET NULL,
    employee_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    email VARCHAR(200),
    phone VARCHAR(50),
    hire_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON shared.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON shared.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_no ON shared.employees(employee_no);

-- 用户与员工关联表
CREATE TABLE IF NOT EXISTS shared.user_employee_map (
    user_id UUID PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES shared.employees(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 集中ID记录表
CREATE TABLE IF NOT EXISTS shared.id_records (
    id VARCHAR(50) PRIMARY KEY,
    id_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    company_id UUID REFERENCES shared.companies(id) ON DELETE SET NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_id_records_type ON shared.id_records(id_type);
CREATE INDEX IF NOT EXISTS idx_id_records_company ON shared.id_records(company_id);

-- 系统参数表
CREATE TABLE IF NOT EXISTS shared.system_params (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    param_key VARCHAR(100) UNIQUE NOT NULL,
    param_value TEXT,
    param_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    module VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION shared.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要自动更新时间戳的表创建触发器
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_companies_updated_at') THEN
        CREATE TRIGGER trigger_companies_updated_at
        BEFORE UPDATE ON shared.companies
        FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_departments_updated_at') THEN
        CREATE TRIGGER trigger_departments_updated_at
        BEFORE UPDATE ON shared.departments
        FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_positions_updated_at') THEN
        CREATE TRIGGER trigger_positions_updated_at
        BEFORE UPDATE ON shared.positions
        FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_employees_updated_at') THEN
        CREATE TRIGGER trigger_employees_updated_at
        BEFORE UPDATE ON shared.employees
        FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_system_params_updated_at') THEN
        CREATE TRIGGER trigger_system_params_updated_at
        BEFORE UPDATE ON shared.system_params
        FOR EACH ROW EXECUTE FUNCTION shared.update_modified_column();
    END IF;
END $$;

-- 插入初始系统参数
INSERT INTO shared.system_params (param_key, param_value, param_type, description, module) VALUES
('system.name', 'TOPEMS', 'string', '系统名称', 'system'),
('system.version', '2.0.0', 'string', '系统版本', 'system'),
('erp.default_period', '202601', 'string', 'ERP默认期间', 'erp'),
('hrm.work_hours_per_day', '8', 'integer', '每日工作小时数', 'hrm')
ON CONFLICT (param_key) DO NOTHING;