-- ================================================================================
-- TOPEMS shared schema 建表脚本
-- 版本: v1.0.0
-- 说明: 创建共享 schema 和跨服务共享的数据表
--
-- 设计原则:
--   - shared schema 存放跨多个业务服务共享的基础数据
--   - 各业务服务通过 SEARCH_PATH 访问 shared 表
--   - shared 中的表为只读或低频写入类型，避免成为性能瓶颈
--
-- 服务引用关系:
--   pm, wms, crm, hrm, scm, srm, ai → search_path 包含 shared
-- ================================================================================

BEGIN;

-- 创建 shared schema
CREATE SCHEMA IF NOT EXISTS shared;

-- ================================================================================
-- 1. 计量单位表
--    用于各业务模块（采购、库存、销售、财务等）统一计量单位
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.unit_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tenant_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES shared.unit_categories(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20),
    description TEXT,
    conversion_factor NUMERIC(15,6) NOT NULL DEFAULT 1,
    base_unit_id UUID REFERENCES shared.units(id),
    tenant_id UUID NOT NULL,
    is_base_unit BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_id, code, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_units_category ON shared.units(category_id);
CREATE INDEX IF NOT EXISTS idx_units_tenant ON shared.units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_units_code ON shared.units(code);

-- ================================================================================
-- 2. 编号序列表
--    用于自动生成业务单据编号（订单号、合同号、资产编号等）
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.number_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    prefix VARCHAR(50) NOT NULL DEFAULT '',
    suffix VARCHAR(50) NOT NULL DEFAULT '',
    separator VARCHAR(10) NOT NULL DEFAULT '-',
    date_format VARCHAR(20) NOT NULL DEFAULT 'YYYYMMDD',
    current_value BIGINT NOT NULL DEFAULT 0,
    min_value BIGINT NOT NULL DEFAULT 1,
    max_value BIGINT,
    reset_cycle VARCHAR(20) NOT NULL DEFAULT 'none',
    tenant_id UUID NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_number_sequences_tenant ON shared.number_sequences(tenant_id);

-- ================================================================================
-- 3. 汇率表
--    用于多币种业务场景下的汇率管理
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(5),
    precision INTEGER NOT NULL DEFAULT 2,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency_id UUID NOT NULL REFERENCES shared.currencies(id),
    to_currency_id UUID NOT NULL REFERENCES shared.currencies(id),
    rate NUMERIC(18, 8) NOT NULL,
    effective_date DATE NOT NULL,
    rate_type VARCHAR(20) NOT NULL DEFAULT 'spot',
    source VARCHAR(100),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_currency_id, to_currency_id, effective_date, rate_type)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_from ON shared.exchange_rates(from_currency_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_to ON shared.exchange_rates(to_currency_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON shared.exchange_rates(effective_date);

-- ================================================================================
-- 4. 分类编码表
--    用于业务分类（产品分类、客户分类、地区分类等）
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.code_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_type VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES shared.code_categories(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 1,
    path VARCHAR(500),
    sort_order INTEGER NOT NULL DEFAULT 0,
    icon VARCHAR(100),
    description TEXT,
    tenant_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_type, code, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_code_categories_type ON shared.code_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_code_categories_parent ON shared.code_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_code_categories_tenant ON shared.code_categories(tenant_id);

-- ================================================================================
-- 5. 数据字典表（增强版）
--    用于跨服务共享的枚举值、状态码、类型定义等
--    与 public.core_dict_types / public.core_dict_items 互补
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.shared_dict_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    description TEXT,
    value_type VARCHAR(50) NOT NULL DEFAULT 'string',
    group_code VARCHAR(50),
    tenant_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared.shared_dict_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dict_type_id UUID NOT NULL REFERENCES shared.shared_dict_types(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    value TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    parent_id UUID REFERENCES shared.shared_dict_items(id) ON DELETE SET NULL,
    extra_data JSONB,
    tenant_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(dict_type_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shared_dict_items_type ON shared.shared_dict_items(dict_type_id);
CREATE INDEX IF NOT EXISTS idx_shared_dict_items_parent ON shared.shared_dict_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_shared_dict_types_category ON shared.shared_dict_types(category);
CREATE INDEX IF NOT EXISTS idx_shared_dict_items_tenant ON shared.shared_dict_items(tenant_id);

-- ================================================================================
-- 6. 地区行政区划表
--    用于地址选择、区域筛选等场景
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50),
    region_type VARCHAR(20) NOT NULL,
    parent_code VARCHAR(20),
    level INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regions_type ON shared.regions(region_type);
CREATE INDEX IF NOT EXISTS idx_regions_parent ON shared.regions(parent_code);
CREATE INDEX IF NOT EXISTS idx_regions_level ON shared.regions(level);

-- ================================================================================
-- 7. 附件/文件关联表
--    用于跨服务共享的文件引用
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_ext VARCHAR(20),
    file_size BIGINT NOT NULL DEFAULT 0,
    file_path VARCHAR(1000),
    mime_type VARCHAR(100),
    storage_type VARCHAR(50) NOT NULL DEFAULT 'local',
    thumbnail_url VARCHAR(1000),
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    tenant_id UUID NOT NULL,
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, file_name)
);

CREATE INDEX IF NOT EXISTS idx_file_attachments_entity ON shared.file_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_tenant ON shared.file_attachments(tenant_id);

-- ================================================================================
-- 8. 标签/标签组表
--    用于跨服务共享的标签分类体系
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.tag_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    tenant_id UUID NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(code, tenant_id)
);

CREATE TABLE IF NOT EXISTS shared.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES shared.tag_groups(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    description TEXT,
    tenant_id UUID NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, code)
);

CREATE TABLE IF NOT EXISTS shared.entity_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    tag_id UUID NOT NULL REFERENCES shared.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_group ON shared.tags(group_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON shared.entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON shared.entity_tags(tag_id);

-- ================================================================================
-- 9. 系统配置表（跨服务共享）
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(200) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    value_type VARCHAR(50) NOT NULL DEFAULT 'json',
    description TEXT,
    is_readonly BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_configs_tenant ON shared.system_configs(tenant_id);

-- ================================================================================
-- 10. 数据变更日志表
--     用于跨服务的数据变更追踪
-- ================================================================================

CREATE TABLE IF NOT EXISTS shared.change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    changed_by_name VARCHAR(255),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_logs_table ON shared.change_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_change_logs_record ON shared.change_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_tenant ON shared.change_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_created ON shared.change_logs(created_at);

-- ================================================================================
-- 初始数据
-- ================================================================================

-- 插入默认计量单位分类
INSERT INTO shared.unit_categories (id, code, name, description, tenant_id) VALUES
('00000000-0000-0000-0000-000000000001', 'length', '长度', '长度计量单位', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000002', 'weight', '重量', '重量计量单位', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000003', 'quantity', '数量', '数量计量单位', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000004', 'area', '面积', '面积计量单位', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000005', 'volume', '体积', '体积计量单位', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000006', 'time', '时间', '时间计量单位', '00000000-0000-0000-0000-000000000001');

-- 插入默认计量单位
INSERT INTO shared.units (id, category_id, code, name, symbol, conversion_factor, is_base_unit, tenant_id) VALUES
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'm', '米', 'm', 1, TRUE, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'cm', '厘米', 'cm', 0.01, FALSE, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'mm', '毫米', 'mm', 0.001, FALSE, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'km', '千米', 'km', 1000, FALSE, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'kg', '千克', 'kg', 1, TRUE, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'g', '克', 'g', 0.001, FALSE, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000002', 't', '吨', 't', 1000, FALSE, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000003', 'pcs', '件', 'pcs', 1, TRUE, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000003', 'box', '箱', 'box', 1, FALSE, '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000003', 'set', '套', 'set', 1, FALSE, '00000000-0000-0000-0000-000000000001');

-- 插入默认币种
INSERT INTO shared.currencies (id, code, name, symbol, precision) VALUES
('00000000-0000-0000-0000-000000000100', 'CNY', '人民币', '¥', 2),
('00000000-0000-0000-0000-000000000101', 'USD', '美元', '$', 2),
('00000000-0000-0000-0000-000000000102', 'EUR', '欧元', '€', 2),
('00000000-0000-0000-0000-000000000103', 'GBP', '英镑', '£', 2),
('00000000-0000-0000-0000-000000000104', 'JPY', '日元', '¥', 0);

-- 插入默认字典类型
INSERT INTO shared.shared_dict_types (code, name, category, description, tenant_id, is_system) VALUES
('order_status', '订单状态', 'order', '订单状态枚举', '00000000-0000-0000-0000-000000000001', TRUE),
('priority', '优先级', 'general', '通用优先级', '00000000-0000-0000-0000-000000000001', TRUE),
('yes_no', '是/否', 'general', '通用是/否选项', '00000000-0000-0000-0000-000000000001', TRUE),
('gender', '性别', 'hr', '性别选项', '00000000-0000-0000-0000-000000000001', TRUE),
('document_type', '单据类型', 'document', '业务单据类型', '00000000-0000-0000-0000-000000000001', TRUE),
('payment_method', '支付方式', 'finance', '支付方式', '00000000-0000-0000-0000-000000000001', TRUE);

COMMIT;
