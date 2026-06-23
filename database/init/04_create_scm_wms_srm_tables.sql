-- ================================================================================
-- TOPEMS SCM-WMS-SRM 供应链集成表结构
-- 版本: v2.1.0
-- 日期: 2026-06-23
-- 说明: 创建供应链管理、仓储管理、供应商管理模块的完整表结构及跨模块同步机制
-- ================================================================================

-- ================================================================================
-- 1. 跨模块同步日志表（统一核心）
-- ================================================================================

CREATE TABLE IF NOT EXISTS unified_core.inter_module_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    source_module VARCHAR(50) NOT NULL,
    target_module VARCHAR(50) NOT NULL,
    source_entity VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    source_code VARCHAR(100),
    target_id UUID,
    target_code VARCHAR(100),
    operation VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    sync_data JSONB,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.inter_module_sync IS '跨模块数据同步日志表';
COMMENT ON COLUMN unified_core.inter_module_sync.sync_type IS '同步类型: purchase_to_inbound, outbound_to_shipping, supplier_sync';
COMMENT ON COLUMN unified_core.inter_module_sync.source_module IS '源模块: scm, wms, srm';
COMMENT ON COLUMN unified_core.inter_module_sync.target_module IS '目标模块: scm, wms, srm, crm';
COMMENT ON COLUMN unified_core.inter_module_sync.operation IS '操作类型: create, update, delete';
COMMENT ON COLUMN unified_core.inter_module_sync.status IS '同步状态: pending, processing, success, failed';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_tenant_id ON unified_core.inter_module_sync(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_sync_type ON unified_core.inter_module_sync(sync_type);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_source_module ON unified_core.inter_module_sync(source_module);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_target_module ON unified_core.inter_module_sync(target_module);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_status ON unified_core.inter_module_sync(status);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_next_retry ON unified_core.inter_module_sync(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_inter_module_sync_source_id ON unified_core.inter_module_sync(source_id);

-- ================================================================================
-- 2. SCM 插件（供应链管理）
-- ================================================================================

-- 供应商表
CREATE TABLE IF NOT EXISTS plugin_scm.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    email VARCHAR(255),
    address VARCHAR(500),
    bank_account VARCHAR(100),
    tax_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    sync_from_srm BOOLEAN DEFAULT FALSE,
    srm_supplier_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_scm.suppliers IS 'SCM供应商表';
COMMENT ON COLUMN plugin_scm.suppliers.sync_from_srm IS '是否从SRM同步';

-- 采购订单表
CREATE TABLE IF NOT EXISTS plugin_scm.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    supplier_id UUID REFERENCES plugin_scm.suppliers(id) ON DELETE SET NULL,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_date TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'draft',
    remarks TEXT,
    inbound_order_id UUID,
    inbound_order_number VARCHAR(100),
    is_synced_to_wms BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE plugin_scm.purchase_orders IS '采购订单表';
COMMENT ON COLUMN plugin_scm.purchase_orders.is_synced_to_wms IS '是否已同步到WMS';

-- 采购订单明细表
CREATE TABLE IF NOT EXISTS plugin_scm.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    purchase_order_id UUID REFERENCES plugin_scm.purchase_orders(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255),
    quantity DECIMAL(15, 2) NOT NULL,
    unit_price DECIMAL(15, 2),
    total_amount DECIMAL(15, 2),
    unit VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_scm.purchase_order_items IS '采购订单明细表';

-- SCM入库单表（用于记录从采购订单生成的入库单）
CREATE TABLE IF NOT EXISTS plugin_scm.inbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    warehouse_id UUID REFERENCES plugin_wms.warehouses(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES plugin_scm.suppliers(id) ON DELETE SET NULL,
    purchase_order_id UUID REFERENCES plugin_scm.purchase_orders(id) ON DELETE SET NULL,
    order_date TIMESTAMP WITH TIME ZONE,
    expected_arrival TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE plugin_scm.inbound_orders IS 'SCM入库单表';

-- 供应商评估表
CREATE TABLE IF NOT EXISTS plugin_scm.supplier_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES plugin_scm.suppliers(id) ON DELETE CASCADE,
    evaluation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    quality_score DECIMAL(5, 2),
    delivery_score DECIMAL(5, 2),
    service_score DECIMAL(5, 2),
    price_score DECIMAL(5, 2),
    overall_score DECIMAL(5, 2),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_scm.supplier_evaluations IS '供应商评估表';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_scm_suppliers_tenant_id ON plugin_scm.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scm_suppliers_srm_id ON plugin_scm.suppliers(srm_supplier_id);
CREATE INDEX IF NOT EXISTS idx_scm_purchase_orders_tenant_id ON plugin_scm.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scm_purchase_orders_supplier_id ON plugin_scm.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_scm_purchase_order_items_order_id ON plugin_scm.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_scm_inbound_orders_tenant_id ON plugin_scm.inbound_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scm_supplier_evaluations_supplier_id ON plugin_scm.supplier_evaluations(supplier_id);

-- ================================================================================
-- 3. WMS 插件扩展（仓储管理）
-- ================================================================================

-- 入库单明细表
CREATE TABLE IF NOT EXISTS plugin_wms.inbound_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    inbound_order_id UUID REFERENCES plugin_wms.inbound_orders(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255),
    quantity DECIMAL(15, 2) NOT NULL,
    received_quantity DECIMAL(15, 2) DEFAULT 0,
    unit VARCHAR(20),
    batch_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_wms.inbound_order_items IS '入库单明细表';

-- 出库单明细表
CREATE TABLE IF NOT EXISTS plugin_wms.outbound_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    outbound_order_id UUID REFERENCES plugin_wms.outbound_orders(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255),
    quantity DECIMAL(15, 2) NOT NULL,
    shipped_quantity DECIMAL(15, 2) DEFAULT 0,
    unit VARCHAR(20),
    batch_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_wms.outbound_order_items IS '出库单明细表';

-- 出库单扩展字段（用于销售发货同步）
ALTER TABLE IF EXISTS plugin_wms.outbound_orders
    ADD COLUMN IF NOT EXISTS sales_order_id UUID,
    ADD COLUMN IF NOT EXISTS sales_order_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_synced_to_crm BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN plugin_wms.outbound_orders.sales_order_id IS '关联的销售订单ID';
COMMENT ON COLUMN plugin_wms.outbound_orders.is_synced_to_crm IS '是否已同步到CRM';

-- 库存盘点表
CREATE TABLE IF NOT EXISTS plugin_wms.stock_takes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    stock_take_number VARCHAR(100) NOT NULL,
    warehouse_id UUID REFERENCES plugin_wms.warehouses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    actual_counted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, stock_take_number)
);

COMMENT ON TABLE plugin_wms.stock_takes IS '库存盘点表';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_wms_inbound_order_items_order_id ON plugin_wms.inbound_order_items(inbound_order_id);
CREATE INDEX IF NOT EXISTS idx_wms_outbound_order_items_order_id ON plugin_wms.outbound_order_items(outbound_order_id);
CREATE INDEX IF NOT EXISTS idx_wms_stock_takes_tenant_id ON plugin_wms.stock_takes(tenant_id);

-- ================================================================================
-- 4. SRM 插件（供应商关系管理）
-- ================================================================================

-- 供应商表
CREATE TABLE IF NOT EXISTS plugin_srm.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    supplier_no VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    category VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    tax_id VARCHAR(50),
    address VARCHAR(500),
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    credit_rating VARCHAR(20),
    risk_level VARCHAR(20) DEFAULT 'low',
    sync_from_scm BOOLEAN DEFAULT FALSE,
    scm_supplier_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, supplier_no)
);

COMMENT ON TABLE plugin_srm.suppliers IS 'SRM供应商表';
COMMENT ON COLUMN plugin_srm.suppliers.sync_from_scm IS '是否从SCM同步';

-- 供应商分类表
CREATE TABLE IF NOT EXISTS plugin_srm.supplier_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_no VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES plugin_srm.supplier_categories(id) ON DELETE SET NULL,
    level INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, category_no)
);

COMMENT ON TABLE plugin_srm.supplier_categories IS '供应商分类表';

-- 供应商评估表
CREATE TABLE IF NOT EXISTS plugin_srm.supplier_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES plugin_srm.suppliers(id) ON DELETE CASCADE,
    evaluation_no VARCHAR(100) NOT NULL,
    evaluation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    evaluator VARCHAR(100),
    overall_score DECIMAL(5, 2),
    quality_score DECIMAL(5, 2),
    delivery_score DECIMAL(5, 2),
    service_score DECIMAL(5, 2),
    price_score DECIMAL(5, 2),
    comments TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, evaluation_no)
);

COMMENT ON TABLE plugin_srm.supplier_evaluations IS '供应商评估表';

-- 供应商合同表
CREATE TABLE IF NOT EXISTS plugin_srm.supplier_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    contract_no VARCHAR(100) NOT NULL,
    supplier_id UUID REFERENCES plugin_srm.suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    contract_type VARCHAR(50),
    total_amount DECIMAL(15, 2),
    currency VARCHAR(20) DEFAULT 'CNY',
    sign_date TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft',
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, contract_no)
);

COMMENT ON TABLE plugin_srm.supplier_contracts IS '供应商合同表';

-- 供应商产品表
CREATE TABLE IF NOT EXISTS plugin_srm.supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_no VARCHAR(100) NOT NULL,
    supplier_id UUID REFERENCES plugin_srm.suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(20),
    unit_price DECIMAL(15, 2),
    currency VARCHAR(20) DEFAULT 'CNY',
    min_order_qty INT,
    lead_time_days INT,
    status VARCHAR(20) DEFAULT 'active',
    specifications TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, product_no)
);

COMMENT ON TABLE plugin_srm.supplier_products IS '供应商产品表';

-- 供应商绩效表
CREATE TABLE IF NOT EXISTS plugin_srm.supplier_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES plugin_srm.suppliers(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL,
    total_orders INT DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    on_time_delivery_rate DECIMAL(5, 2),
    defect_rate DECIMAL(5, 2),
    avg_quality_score DECIMAL(5, 2),
    avg_delivery_score DECIMAL(5, 2),
    avg_service_score DECIMAL(5, 2),
    avg_price_score DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, supplier_id, period)
);

COMMENT ON TABLE plugin_srm.supplier_performance IS '供应商绩效表';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_srm_suppliers_tenant_id ON plugin_srm.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_srm_suppliers_scm_id ON plugin_srm.suppliers(scm_supplier_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_categories_tenant_id ON plugin_srm.supplier_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_evaluations_supplier_id ON plugin_srm.supplier_evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_contracts_supplier_id ON plugin_srm.supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_products_supplier_id ON plugin_srm.supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_performance_supplier_id ON plugin_srm.supplier_performance(supplier_id);

-- ================================================================================
-- 完成提示
-- ================================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SCM-WMS-SRM 供应链集成表结构创建完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已创建/更新:';
    RAISE NOTICE '  - unified_core.inter_module_sync (跨模块同步日志)';
    RAISE NOTICE '  - plugin_scm.* (供应链管理)';
    RAISE NOTICE '  - plugin_wms.* (仓储管理扩展)';
    RAISE NOTICE '  - plugin_srm.* (供应商关系管理)';
    RAISE NOTICE '========================================';
END $$;