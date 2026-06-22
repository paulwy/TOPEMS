-- =====================================================
-- TOPEMS Shared Schema 扩展
-- 用于存储跨模块共享的基础数据
-- =====================================================

-- =====================================================
-- 1. 客户表 (Customer)
-- 编码规则: S-CUST-{6位序号}
-- =====================================================
CREATE TABLE IF NOT EXISTS shared.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(200),
    address TEXT,
    industry VARCHAR(100),
    category VARCHAR(50),
    credit_level VARCHAR(20) DEFAULT 'normal',
    credit_limit DECIMAL(15,2),
    tax_id VARCHAR(50),
    bank_account VARCHAR(100),
    bank_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    extension JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON shared.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_code ON shared.customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON shared.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_status ON shared.customers(status);

-- =====================================================
-- 2. 供应商表 (Supplier)
-- 编码规则: V-SUP-{6位序号}
-- =====================================================
CREATE TABLE IF NOT EXISTS shared.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(200),
    address TEXT,
    industry VARCHAR(100),
    category VARCHAR(50),
    supplier_type VARCHAR(20) DEFAULT 'manufacturer',
    credit_level VARCHAR(20) DEFAULT 'normal',
    credit_limit DECIMAL(15,2),
    tax_id VARCHAR(50),
    bank_account VARCHAR(100),
    bank_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    extension JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON shared.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON shared.suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON shared.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON shared.suppliers(status);

-- =====================================================
-- 3. 物料表 (Material)
-- 编码规则: MAT-{6位序号}
-- =====================================================
CREATE TABLE IF NOT EXISTS shared.materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    category VARCHAR(100),
    material_type VARCHAR(50) NOT NULL DEFAULT 'raw',
    unit VARCHAR(20) DEFAULT 'PCS',
    spec VARCHAR(200),
    color VARCHAR(50),
    size VARCHAR(100),
    weight DECIMAL(15,4),
    weight_unit VARCHAR(20),
    safety_stock DECIMAL(15,4),
    min_stock DECIMAL(15,4),
    max_stock DECIMAL(15,4),
    standard_cost DECIMAL(15,4),
    standard_price DECIMAL(15,4),
    barcode VARCHAR(100),
    qr_code VARCHAR(200),
    shelf_life_days INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    extension JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_tenant ON shared.materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_code ON shared.materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_name ON shared.materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_category ON shared.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_type ON shared.materials(material_type);
CREATE INDEX IF NOT EXISTS idx_materials_status ON shared.materials(status);

-- =====================================================
-- 4. 编码映射表 (Code Mapping)
-- 用于外部系统同步时的编码对应关系
-- =====================================================
CREATE TABLE IF NOT EXISTS shared.code_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    external_system VARCHAR(50) NOT NULL,
    external_code VARCHAR(100) NOT NULL,
    internal_code VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    last_sync_at TIMESTAMP,
    sync_error TEXT,
    extension JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(external_system, external_code)
);

CREATE INDEX IF NOT EXISTS idx_code_mappings_tenant ON shared.code_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_code_mappings_system ON shared.code_mappings(external_system);
CREATE INDEX IF NOT EXISTS idx_code_mappings_internal ON shared.code_mappings(internal_code);
CREATE INDEX IF NOT EXISTS idx_code_mappings_status ON shared.code_mappings(sync_status);

-- =====================================================
-- 5. 同步日志表 (Sync Log)
-- 记录跨模块/跨系统数据同步历史
-- =====================================================
CREATE TABLE IF NOT EXISTS shared.sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    source_system VARCHAR(50) NOT NULL,
    target_system VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    source_code VARCHAR(100),
    target_code VARCHAR(100),
    operation VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    request_data JSONB,
    response_data JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    executed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant ON shared.sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON shared.sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON shared.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON shared.sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_executed ON shared.sync_logs(executed_at);

-- =====================================================
-- 6. 数据变更历史表 (Audit Log)
-- 记录所有跨模块共享数据的变更
-- =====================================================
CREATE TABLE IF NOT EXISTS shared.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    entity_code VARCHAR(100),
    operation VARCHAR(20) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_fields JSONB,
    changed_by UUID,
    changed_by_name VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON shared.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON shared.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_code ON shared.audit_logs(entity_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON shared.audit_logs(created_at);

-- =====================================================
-- 7. 编码序列表 (Code Sequence)
-- 用于生成各类业务编码
-- =====================================================
CREATE TABLE IF NOT EXISTS shared.code_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code_type VARCHAR(50) UNIQUE NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    current_value BIGINT NOT NULL DEFAULT 0,
    padding_length INTEGER NOT NULL DEFAULT 6,
    step INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_sequences_tenant ON shared.code_sequences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_code_sequences_type ON shared.code_sequences(code_type);

-- 初始化默认序列
INSERT INTO shared.code_sequences (code_type, prefix, current_value, padding_length, description) VALUES
('customer', 'S-CUST-', 0, 6, '客户编码序列'),
('supplier', 'V-SUP-', 0, 6, '供应商编码序列'),
('material', 'MAT-', 0, 6, '物料编码序列')
ON CONFLICT (code_type) DO NOTHING;

-- =====================================================
-- 触发器：为需要自动更新时间戳的表创建触发器
-- =====================================================
CREATE OR REPLACE FUNCTION shared.update_shared_tables_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Customer 触发器
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_customers_updated_at') THEN
        CREATE TRIGGER trigger_customers_updated_at
        BEFORE UPDATE ON shared.customers
        FOR EACH ROW EXECUTE FUNCTION shared.update_shared_tables_modified_column();
    END IF;
END $$;

-- Supplier 触发器
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_suppliers_updated_at') THEN
        CREATE TRIGGER trigger_suppliers_updated_at
        BEFORE UPDATE ON shared.suppliers
        FOR EACH ROW EXECUTE FUNCTION shared.update_shared_tables_modified_column();
    END IF;
END $$;

-- Material 触发器
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_materials_updated_at') THEN
        CREATE TRIGGER trigger_materials_updated_at
        BEFORE UPDATE ON shared.materials
        FOR EACH ROW EXECUTE FUNCTION shared.update_shared_tables_modified_column();
    END IF;
END $$;

-- Code Mapping 触发器
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_code_mappings_updated_at') THEN
        CREATE TRIGGER trigger_code_mappings_updated_at
        BEFORE UPDATE ON shared.code_mappings
        FOR EACH ROW EXECUTE FUNCTION shared.update_shared_tables_modified_column();
    END IF;
END $$;

-- =====================================================
-- 注释说明
-- =====================================================
COMMENT ON TABLE shared.customers IS '客户表 - 存储所有客户信息，被 CRM, ERP, QMS 等模块共用';
COMMENT ON TABLE shared.suppliers IS '供应商表 - 存储所有供应商信息，被 SRM, SCM, WMS 等模块共用';
COMMENT ON TABLE shared.materials IS '物料表 - 存储所有物料信息，被 MES, PDM, WMS, LIMS 等模块共用';
COMMENT ON TABLE shared.code_mappings IS '编码映射表 - 存储外部系统编码与内部编码的对应关系';
COMMENT ON TABLE shared.sync_logs IS '同步日志表 - 记录跨模块/跨系统的数据同步历史';
COMMENT ON TABLE shared.audit_logs IS '审计日志表 - 记录共享数据的变更历史';
COMMENT ON TABLE shared.code_sequences IS '编码序列表 - 用于生成各类业务编码';

-- =====================================================
-- 8. 项目表 (Project)
-- 编码规则: R-PROJ-{6位序号}
-- 用于财务报销、票据、凭证等跨模块关联
-- =====================================================
CREATE TABLE IF NOT EXISTS shared.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    project_type VARCHAR(50),
    category VARCHAR(50),
    department_id UUID,
    manager_id UUID,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    cost_center VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    description TEXT,
    extension JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON shared.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_code ON shared.projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_name ON shared.projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_type ON shared.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_status ON shared.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_cost_center ON shared.projects(cost_center);

-- Project 触发器
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_projects_updated_at') THEN
        CREATE TRIGGER trigger_projects_updated_at
        BEFORE UPDATE ON shared.projects
        FOR EACH ROW EXECUTE FUNCTION shared.update_shared_tables_modified_column();
    END IF;
END $$;

-- 初始化项目序列
INSERT INTO shared.code_sequences (code_type, prefix, current_value, padding_length, description) VALUES
('project', 'R-PROJ-', 0, 6, '项目编码序列')
ON CONFLICT (code_type) DO NOTHING;

COMMENT ON TABLE shared.projects IS '项目表 - 存储所有项目信息，用于财务报销、票据、凭证等跨模块关联';

-- =====================================================
-- 注释说明
-- =====================================================
