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
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sync_type character varying(50) NOT NULL,
    source_module character varying(50) NOT NULL,
    target_module character varying(50) NOT NULL,
    source_entity character varying(50) NOT NULL,
    source_id uuid NOT NULL,
    source_code character varying(100),
    target_id uuid,
    target_code character varying(100),
    operation character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    next_retry_at timestamp with time zone,
    sync_data jsonb,
    executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT ck_inter_module_sync_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT inter_module_sync_pkey PRIMARY KEY (id)
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
-- 4. SRM 插件（供应商关系管理）
-- ================================================================================

-- 供应商表
CREATE TABLE IF NOT EXISTS srm.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_no character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    legal_name character varying(200),
    category character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tax_id character varying(50),
    address character varying(500),
    contact_person character varying(100),
    phone text,
    email text,
    website character varying(200),
    credit_rating character varying(20),
    risk_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    bank_name character varying(100),
    bank_account character varying(50),
    sync_from_scm boolean DEFAULT false NOT NULL,
    scm_supplier_id uuid,
    name_en character varying(255),
    CONSTRAINT ck_suppliers_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT suppliers_pkey PRIMARY KEY (id),
    CONSTRAINT suppliers_supplier_no_key UNIQUE (supplier_no)
);

COMMENT ON TABLE srm.suppliers IS 'SRM供应商表';
COMMENT ON COLUMN srm.suppliers.sync_from_scm IS '是否从SCM同步';

-- 供应商分类表
CREATE TABLE IF NOT EXISTS srm.supplier_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_no character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id uuid,
    level integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    name_en character varying(255),
    CONSTRAINT supplier_categories_category_no_key UNIQUE (category_no),
    CONSTRAINT supplier_categories_pkey PRIMARY KEY (id),
    CONSTRAINT supplier_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES srm.supplier_categories(id)
);

COMMENT ON TABLE srm.supplier_categories IS '供应商分类表';

-- 供应商评估表
CREATE TABLE IF NOT EXISTS srm.supplier_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    evaluation_no character varying(50) NOT NULL,
    evaluation_date timestamp with time zone NOT NULL,
    evaluator character varying(100),
    overall_score numeric(5,2),
    quality_score numeric(5,2),
    delivery_score numeric(5,2),
    service_score numeric(5,2),
    price_score numeric(5,2),
    comments text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_supplier_evaluations_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT supplier_evaluations_evaluation_no_key UNIQUE (evaluation_no),
    CONSTRAINT supplier_evaluations_pkey PRIMARY KEY (id),
    CONSTRAINT supplier_evaluations_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES srm.suppliers(id)
);

COMMENT ON TABLE srm.supplier_evaluations IS '供应商评估表';

-- 供应商合同表
CREATE TABLE IF NOT EXISTS srm.supplier_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_no character varying(50) NOT NULL,
    supplier_id uuid NOT NULL,
    supplier_name character varying(200),
    title character varying(200) NOT NULL,
    contract_type character varying(50) NOT NULL,
    total_amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    sign_date timestamp with time zone,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_supplier_contracts_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT supplier_contracts_contract_no_key UNIQUE (contract_no),
    CONSTRAINT supplier_contracts_pkey PRIMARY KEY (id),
    CONSTRAINT supplier_contracts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES srm.suppliers(id)
);

COMMENT ON TABLE srm.supplier_contracts IS '供应商合同表';

-- 供应商产品表
CREATE TABLE IF NOT EXISTS srm.supplier_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_no character varying(50) NOT NULL,
    supplier_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    category character varying(50),
    unit character varying(20),
    unit_price numeric(10,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    min_order_qty integer,
    lead_time_days integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    specifications text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    CONSTRAINT ck_supplier_products_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))),
    CONSTRAINT supplier_products_pkey PRIMARY KEY (id),
    CONSTRAINT supplier_products_product_no_key UNIQUE (product_no),
    CONSTRAINT supplier_products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES srm.suppliers(id)
);

COMMENT ON TABLE srm.supplier_products IS '供应商产品表';

-- 供应商绩效表
CREATE TABLE IF NOT EXISTS srm.supplier_performance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    order_count integer DEFAULT 0 NOT NULL,
    total_amount numeric(15,2),
    last_order_date timestamp with time zone,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT supplier_performance_pkey PRIMARY KEY (id),
    CONSTRAINT supplier_performance_supplier_id_tenant_id_key UNIQUE (supplier_id, tenant_id)
);

COMMENT ON TABLE srm.supplier_performance IS '供应商绩效表';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_srm_suppliers_tenant_id ON srm.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_srm_suppliers_scm_id ON srm.suppliers(scm_supplier_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_categories_tenant_id ON srm.supplier_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_evaluations_supplier_id ON srm.supplier_evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_contracts_supplier_id ON srm.supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_products_supplier_id ON srm.supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_srm_supplier_performance_supplier_id ON srm.supplier_performance(supplier_id);

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
    RAISE NOTICE '  - srm.* (供应商关系管理)';
    RAISE NOTICE '========================================';
END $$;