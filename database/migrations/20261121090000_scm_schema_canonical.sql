-- 20261121090000: scm 28 张运行期表收口（W2-D2 第十四个模块）
--
-- 背景：svc/scm/src/schema_defense.rs 的 TABLE_DEFS 声明 27 张表（418 列），
-- 启动时建骨架表并逐列补列；server scm_real_module 与独立部署 main.rs
-- 另调用 default_init_db(..., with_master_data_refs=true)，额外创建
-- scm.scm_master_data_refs（13 列）。
-- 28 张表在 live scm schema 全部存在；27 张 TABLE_DEFS 表与 batch1/batch2
-- 死表清单无冲突。
-- scm.scm_master_data_refs 虽被 20261119110000_drop_dead_tables_batch2 归档，
-- 但 svc/scm/src/event_handlers/mod.rs 的 upsert_local_master_data_ref 仍通过
-- MasterDataRefService::with_table("scm_master_data_refs", ...) 写入，
-- 属活跃功能依赖；本迁移保留并固化其 live 形状，待业务确认后再评审。
-- 以 baseline+forward 库真实形状固化：28 表 / 499 列 / 29 约束 / 8 附加索引 /
-- 27 策略 / 28 RLS，列、约束、索引、策略、RLS 五项 diff 为 0。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS scm.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    entity_type text,
    entity_id uuid,
    entity_ids jsonb,
    user_name text,
    request_details jsonb,
    response_details jsonb,
    status character varying(32),
    error_message text,
    success boolean,
    user_id character varying,
    action character varying(20) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by uuid,
    ip_address character varying(50),
    new_values jsonb,
    old_values jsonb,
    organization_id uuid,
    record_id uuid,
    table_name character varying(50) DEFAULT ''::character varying NOT NULL,
    tenant_id uuid,
    user_agent character varying(200)
);

CREATE TABLE IF NOT EXISTS scm.mrp_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    suggestion_number character varying(100) NOT NULL,
    material_code character varying(100) NOT NULL,
    material_name character varying(500) NOT NULL,
    specification text,
    unit character varying(50),
    current_stock numeric(18,4) DEFAULT 0 NOT NULL,
    required_quantity numeric(18,4) DEFAULT 0 NOT NULL,
    suggested_quantity numeric(18,4) DEFAULT 0 NOT NULL,
    supplier_id uuid,
    supplier_name character varying(200),
    lead_time_days integer,
    suggested_order_date date,
    suggested_delivery_date date,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    source_type character varying(50),
    source_order_id uuid,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS scm.price_comparison_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comparison_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    quote_id uuid NOT NULL,
    quality_score numeric(5,2),
    price_score numeric(5,2),
    delivery_score numeric(5,2),
    service_score numeric(5,2),
    total_score numeric(5,2),
    rank integer,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.price_comparisons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_id uuid NOT NULL,
    comparison_no character varying(50) NOT NULL,
    compared_at timestamp with time zone DEFAULT now() NOT NULL,
    recommended_supplier_id uuid,
    recommended_quote_id uuid,
    total_score numeric(5,2),
    quality_score numeric(5,2),
    price_score numeric(5,2),
    delivery_score numeric(5,2),
    service_score numeric(5,2),
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.purchase_contract_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    line_number integer NOT NULL,
    product_code character varying(100),
    product_name character varying(500) NOT NULL,
    specification text,
    unit character varying(50),
    quantity numeric(18,4) NOT NULL,
    unit_price numeric(18,4),
    amount numeric(18,2),
    delivery_date date,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS scm.purchase_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_no character varying(100) NOT NULL,
    title character varying(500) NOT NULL,
    contract_type character varying(100) NOT NULL,
    supplier_id character varying(100) NOT NULL,
    supplier_name character varying(200),
    sign_date date,
    effective_date date,
    expiry_date date,
    total_amount numeric(18,2),
    currency character varying(10),
    payment_terms text,
    delivery_terms text,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    approval_status character varying(50),
    approver character varying(100),
    approved_at timestamp with time zone,
    signed_by character varying(100),
    contract_file character varying(500),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS scm.purchase_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    inquiry_date timestamp with time zone DEFAULT now() NOT NULL,
    deadline timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS scm.purchase_inquiry_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_id uuid NOT NULL,
    item_name character varying(200) NOT NULL,
    specification character varying(200),
    unit character varying(20),
    quantity numeric(10,2) NOT NULL,
    target_price numeric(10,2),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS scm.purchase_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    product_code character varying,
    product_name character varying,
    amount double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_name character varying(200) NOT NULL,
    item_no character varying(50) NOT NULL,
    order_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    received_quantity numeric(10,2) DEFAULT 0,
    remarks text,
    specification character varying(200),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_id uuid,
    total_price numeric(15,2) NOT NULL,
    unit character varying(20),
    unit_price numeric(10,2) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS scm.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    delivery_date timestamp with time zone,
    actual_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    expected_date timestamp with time zone,
    inbound_order_id uuid,
    inbound_order_number character varying(50),
    is_synced_to_wms boolean DEFAULT false NOT NULL,
    last_sync_at timestamp with time zone,
    order_date timestamp with time zone DEFAULT now() NOT NULL,
    po_no character varying(50) NOT NULL,
    remarks text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    supplier_id uuid NOT NULL,
    sync_error text,
    sync_retry_count integer DEFAULT 0 NOT NULL,
    tenant_id uuid,
    total_amount numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS scm.purchase_requisitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requisition_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    applicant_id uuid,
    applicant_name character varying(100),
    department_id uuid,
    department_name character varying(100),
    request_date timestamp with time zone NOT NULL,
    required_date timestamp with time zone,
    total_amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying,
    supplier_id uuid,
    supplier_name character varying(200),
    approval_status character varying(50),
    approver character varying(100),
    approved_at timestamp with time zone,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS scm.scm_master_data_refs (
    master_data_id character varying(128) NOT NULL,
    tenant_id uuid NOT NULL,
    domain character varying(32) NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    source_service character varying(64) NOT NULL,
    local_entity_type character varying(64),
    local_entity_id uuid,
    payload_snapshot jsonb,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scm.srm_supplier_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_code character varying(50) NOT NULL,
    supplier_name character varying(200) NOT NULL,
    legal_name character varying(200),
    contact_name character varying(100),
    contact_email text,
    contact_phone text,
    address text,
    tax_id character varying(50),
    website character varying(500),
    category character varying(100),
    level character varying(20),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.supplier_admission_audit_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_id uuid NOT NULL,
    audit_item character varying(200) NOT NULL,
    audit_result character varying(50),
    auditor character varying(100),
    audit_date timestamp with time zone,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS scm.supplier_admissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_no character varying(100) NOT NULL,
    supplier_name character varying(200) NOT NULL,
    short_name character varying(100),
    contact_person character varying(100),
    contact_phone text,
    contact_email text,
    address text,
    business_license character varying(200),
    tax_registration character varying(200),
    organization_code character varying(100),
    legal_representative character varying(100),
    registered_capital character varying(50),
    established_date date,
    business_scope text,
    supplier_category character varying(100),
    risk_level character varying(50),
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    approval_status character varying(50),
    approver character varying(100),
    approved_at timestamp with time zone,
    applicant character varying(100),
    application_date date,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS scm.supplier_delivery_appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    actual_arrival_time timestamp with time zone,
    applicant character varying(100),
    appointment_no character varying(50) NOT NULL,
    approved_at timestamp with time zone,
    approver character varying(100),
    cargo_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    delivery_date date NOT NULL,
    delivery_method character varying(50) NOT NULL,
    delivery_time time without time zone,
    destination_warehouse character varying(100),
    driver_name character varying(100),
    driver_phone text,
    expected_arrival_time time without time zone,
    purchase_order_id uuid,
    purchase_order_no character varying(100),
    rejection_reason text,
    remarks text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    supplier_id uuid NOT NULL,
    supplier_name character varying(255),
    tenant_id uuid,
    total_quantity numeric(15,2),
    total_weight numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vehicle_no character varying(50)
);

CREATE TABLE IF NOT EXISTS scm.supplier_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    total_score double precision DEFAULT 0,
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    delivery_score numeric(5,2),
    evaluation_date timestamp with time zone NOT NULL,
    evaluation_no character varying(50) NOT NULL,
    evaluator character varying(100),
    overall_score numeric(5,2),
    price_score numeric(5,2),
    quality_score numeric(5,2),
    service_score numeric(5,2),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    supplier_id uuid NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS scm.supplier_quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    inquiry_item_id uuid NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    lead_time_days integer,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS scm.supplier_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    quote_no character varying(50) NOT NULL,
    quote_date timestamp with time zone DEFAULT now() NOT NULL,
    total_amount numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    delivery_days integer,
    valid_until timestamp with time zone,
    payment_terms character varying(200),
    status character varying(20) DEFAULT 'submitted'::character varying NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS scm.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_no character varying(50),
    name character varying(200) NOT NULL,
    legal_name character varying(200),
    category character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tax_id character varying(50),
    address character varying(500),
    contact_person character varying(100),
    phone text,
    email text,
    website character varying(200),
    credit_rating character varying(20),
    risk_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    bank_name character varying(100),
    bank_account character varying(50),
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    sync_from_srm boolean DEFAULT false NOT NULL,
    srm_supplier_id uuid,
    sync_error text,
    sync_retry_count integer DEFAULT 0 NOT NULL,
    last_sync_at timestamp with time zone,
    lead_time_days integer,
    code text,
    level text,
    name_en character varying(255)
);

CREATE TABLE IF NOT EXISTS scm.sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_type character varying(50) NOT NULL,
    source_module character varying(50) NOT NULL,
    target_module character varying(50) NOT NULL,
    source_entity character varying(50) NOT NULL,
    source_id uuid,
    source_code character varying(100),
    target_id uuid,
    target_code character varying(100),
    operation character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    next_retry_at timestamp with time zone,
    executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS scm.sync_record_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_id uuid NOT NULL,
    record_id character varying(100),
    record_name character varying(200),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS scm.sync_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_no character varying(50) NOT NULL,
    source_system character varying(50) NOT NULL,
    target_system character varying(50) NOT NULL,
    sync_type character varying(50) NOT NULL,
    sync_direction character varying(20) DEFAULT 'push'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_seconds integer,
    error_message text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.wms_inbound_order_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying(50) NOT NULL,
    warehouse_id uuid,
    supplier_id uuid,
    order_type character varying(50) DEFAULT 'purchase'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    purchase_order_id uuid,
    purchase_order_number character varying(50),
    total_quantity numeric(18,4) DEFAULT 0 NOT NULL,
    received_at timestamp with time zone,
    tenant_id uuid,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.wms_inventory_movement_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movement_no character varying(50) NOT NULL,
    movement_type character varying(50) NOT NULL,
    warehouse_id uuid,
    item_id uuid,
    item_code character varying(100),
    item_name character varying(200),
    quantity numeric(18,4) NOT NULL,
    unit character varying(20),
    total_value numeric(18,4) DEFAULT 0 NOT NULL,
    reference_type character varying(50),
    reference_id uuid,
    movement_date timestamp with time zone NOT NULL,
    tenant_id uuid,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.wms_inventory_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    warehouse_id uuid,
    item_id uuid,
    item_code character varying(100),
    item_name character varying(200),
    category character varying(100),
    specification character varying(500),
    quantity numeric(18,4) DEFAULT 0 NOT NULL,
    available_quantity numeric(18,4) DEFAULT 0 NOT NULL,
    min_quantity numeric(18,4) DEFAULT 0 NOT NULL,
    total_value numeric(18,4) DEFAULT 0 NOT NULL,
    unit character varying(20),
    warehouse_name character varying(100),
    tenant_id uuid,
    synced_at timestamp with time zone,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.wms_outbound_order_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying(50) NOT NULL,
    warehouse_id uuid,
    customer_id uuid,
    order_type character varying(50) DEFAULT 'sales'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_quantity numeric(18,4) DEFAULT 0 NOT NULL,
    tenant_id uuid,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS scm.wms_replenishment_suggestion_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    suggestion_number character varying(50) NOT NULL,
    warehouse_id uuid,
    item_id uuid,
    item_code character varying(100),
    item_name character varying(200),
    suggested_quantity numeric(18,4) NOT NULL,
    unit character varying(20),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    tenant_id uuid,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS ix_scm_purchase_contract_items_tenant_id ON scm.purchase_contract_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS ix_scm_purchase_inquiries_tenant_id ON scm.purchase_inquiries USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS ix_scm_purchase_inquiry_items_tenant_id ON scm.purchase_inquiry_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS ix_scm_supplier_admission_audit_items_tenant_id ON scm.supplier_admission_audit_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS ix_scm_supplier_quote_items_tenant_id ON scm.supplier_quote_items USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_scm_suppliers_no ON scm.suppliers USING btree (supplier_no);
CREATE UNIQUE INDEX IF NOT EXISTS ux_scm_inbound_snapshot_tenant_po ON scm.wms_inbound_order_snapshots USING btree (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), purchase_order_id) WHERE ((purchase_order_id IS NOT NULL) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_snapshot_wh_item ON scm.wms_inventory_snapshots USING btree (warehouse_id, item_code);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.audit_logs'::regclass AND conname='audit_logs_pkey') THEN
        ALTER TABLE scm.audit_logs ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.mrp_suggestions'::regclass AND conname='mrp_suggestions_pkey') THEN
        ALTER TABLE scm.mrp_suggestions ADD CONSTRAINT "mrp_suggestions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.price_comparison_items'::regclass AND conname='price_comparison_items_pkey') THEN
        ALTER TABLE scm.price_comparison_items ADD CONSTRAINT "price_comparison_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.price_comparisons'::regclass AND conname='price_comparisons_pkey') THEN
        ALTER TABLE scm.price_comparisons ADD CONSTRAINT "price_comparisons_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.purchase_contract_items'::regclass AND conname='purchase_contract_items_pkey') THEN
        ALTER TABLE scm.purchase_contract_items ADD CONSTRAINT "purchase_contract_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.purchase_contracts'::regclass AND conname='purchase_contracts_pkey') THEN
        ALTER TABLE scm.purchase_contracts ADD CONSTRAINT "purchase_contracts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.purchase_inquiries'::regclass AND conname='purchase_inquiries_pkey') THEN
        ALTER TABLE scm.purchase_inquiries ADD CONSTRAINT "purchase_inquiries_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.purchase_inquiry_items'::regclass AND conname='purchase_inquiry_items_pkey') THEN
        ALTER TABLE scm.purchase_inquiry_items ADD CONSTRAINT "purchase_inquiry_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.purchase_items'::regclass AND conname='purchase_items_pkey') THEN
        ALTER TABLE scm.purchase_items ADD CONSTRAINT "purchase_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.purchase_orders'::regclass AND conname='purchase_orders_pkey') THEN
        ALTER TABLE scm.purchase_orders ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.purchase_requisitions'::regclass AND conname='purchase_requisitions_pkey') THEN
        ALTER TABLE scm.purchase_requisitions ADD CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.scm_master_data_refs'::regclass AND conname='scm_master_data_refs_pkey') THEN
        ALTER TABLE scm.scm_master_data_refs ADD CONSTRAINT "scm_master_data_refs_pkey" PRIMARY KEY (master_data_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.srm_supplier_snapshots'::regclass AND conname='srm_supplier_snapshots_pkey') THEN
        ALTER TABLE scm.srm_supplier_snapshots ADD CONSTRAINT "srm_supplier_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.supplier_admission_audit_items'::regclass AND conname='supplier_admission_audit_items_pkey') THEN
        ALTER TABLE scm.supplier_admission_audit_items ADD CONSTRAINT "supplier_admission_audit_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.supplier_admissions'::regclass AND conname='supplier_admissions_pkey') THEN
        ALTER TABLE scm.supplier_admissions ADD CONSTRAINT "supplier_admissions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.supplier_delivery_appointments'::regclass AND conname='supplier_delivery_appointments_pkey') THEN
        ALTER TABLE scm.supplier_delivery_appointments ADD CONSTRAINT "supplier_delivery_appointments_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.supplier_evaluations'::regclass AND conname='supplier_evaluations_pkey') THEN
        ALTER TABLE scm.supplier_evaluations ADD CONSTRAINT "supplier_evaluations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.supplier_quote_items'::regclass AND conname='supplier_quote_items_pkey') THEN
        ALTER TABLE scm.supplier_quote_items ADD CONSTRAINT "supplier_quote_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.supplier_quotes'::regclass AND conname='supplier_quotes_pkey') THEN
        ALTER TABLE scm.supplier_quotes ADD CONSTRAINT "supplier_quotes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.suppliers'::regclass AND conname='suppliers_pkey') THEN
        ALTER TABLE scm.suppliers ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.sync_logs'::regclass AND conname='sync_logs_pkey') THEN
        ALTER TABLE scm.sync_logs ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.sync_record_details'::regclass AND conname='sync_record_details_pkey') THEN
        ALTER TABLE scm.sync_record_details ADD CONSTRAINT "sync_record_details_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.sync_records'::regclass AND conname='sync_records_pkey') THEN
        ALTER TABLE scm.sync_records ADD CONSTRAINT "sync_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.wms_inbound_order_snapshots'::regclass AND conname='wms_inbound_order_snapshots_pkey') THEN
        ALTER TABLE scm.wms_inbound_order_snapshots ADD CONSTRAINT "wms_inbound_order_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.wms_inventory_movement_snapshots'::regclass AND conname='wms_inventory_movement_snapshots_pkey') THEN
        ALTER TABLE scm.wms_inventory_movement_snapshots ADD CONSTRAINT "wms_inventory_movement_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.wms_inventory_snapshots'::regclass AND conname='wms_inventory_snapshots_pkey') THEN
        ALTER TABLE scm.wms_inventory_snapshots ADD CONSTRAINT "wms_inventory_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.wms_outbound_order_snapshots'::regclass AND conname='wms_outbound_order_snapshots_pkey') THEN
        ALTER TABLE scm.wms_outbound_order_snapshots ADD CONSTRAINT "wms_outbound_order_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.wms_replenishment_suggestion_snapshots'::regclass AND conname='wms_replenishment_suggestion_snapshots_pkey') THEN
        ALTER TABLE scm.wms_replenishment_suggestion_snapshots ADD CONSTRAINT "wms_replenishment_suggestion_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='scm.srm_supplier_snapshots'::regclass AND conname='srm_supplier_snapshots_supplier_code_key') THEN
        ALTER TABLE scm.srm_supplier_snapshots ADD CONSTRAINT "srm_supplier_snapshots_supplier_code_key" UNIQUE (supplier_code);
    END IF;
END $$;


ALTER TABLE scm.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.mrp_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.mrp_suggestions FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.price_comparison_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.price_comparison_items FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.price_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.price_comparisons FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_contract_items FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_inquiry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_inquiry_items FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_items FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.purchase_requisitions FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.srm_supplier_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.srm_supplier_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_admission_audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_admission_audit_items FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_admissions FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_delivery_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_delivery_appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_quote_items FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.supplier_quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.sync_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.sync_record_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.sync_record_details FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.sync_records FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_inbound_order_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_inbound_order_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_inventory_movement_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_inventory_movement_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_inventory_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_outbound_order_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_outbound_order_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_replenishment_suggestion_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scm.wms_replenishment_suggestion_snapshots FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.audit_logs;
CREATE POLICY "rls_tenant_isolation" ON scm.audit_logs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.mrp_suggestions;
CREATE POLICY "rls_tenant_isolation" ON scm.mrp_suggestions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.price_comparison_items;
CREATE POLICY "rls_tenant_isolation" ON scm.price_comparison_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.price_comparisons;
CREATE POLICY "rls_tenant_isolation" ON scm.price_comparisons AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.purchase_contract_items;
CREATE POLICY "rls_tenant_isolation" ON scm.purchase_contract_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.purchase_contracts;
CREATE POLICY "rls_tenant_isolation" ON scm.purchase_contracts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.purchase_inquiries;
CREATE POLICY "rls_tenant_isolation" ON scm.purchase_inquiries AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.purchase_inquiry_items;
CREATE POLICY "rls_tenant_isolation" ON scm.purchase_inquiry_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.purchase_items;
CREATE POLICY "rls_tenant_isolation" ON scm.purchase_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.purchase_orders;
CREATE POLICY "rls_tenant_isolation" ON scm.purchase_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.purchase_requisitions;
CREATE POLICY "rls_tenant_isolation" ON scm.purchase_requisitions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.srm_supplier_snapshots;
CREATE POLICY "rls_tenant_isolation" ON scm.srm_supplier_snapshots AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.supplier_admission_audit_items;
CREATE POLICY "rls_tenant_isolation" ON scm.supplier_admission_audit_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.supplier_admissions;
CREATE POLICY "rls_tenant_isolation" ON scm.supplier_admissions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.supplier_delivery_appointments;
CREATE POLICY "rls_tenant_isolation" ON scm.supplier_delivery_appointments AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.supplier_evaluations;
CREATE POLICY "rls_tenant_isolation" ON scm.supplier_evaluations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.supplier_quote_items;
CREATE POLICY "rls_tenant_isolation" ON scm.supplier_quote_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.supplier_quotes;
CREATE POLICY "rls_tenant_isolation" ON scm.supplier_quotes AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.suppliers;
CREATE POLICY "rls_tenant_isolation" ON scm.suppliers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.sync_logs;
CREATE POLICY "rls_tenant_isolation" ON scm.sync_logs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.sync_record_details;
CREATE POLICY "rls_tenant_isolation" ON scm.sync_record_details AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.sync_records;
CREATE POLICY "rls_tenant_isolation" ON scm.sync_records AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.wms_inbound_order_snapshots;
CREATE POLICY "rls_tenant_isolation" ON scm.wms_inbound_order_snapshots AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.wms_inventory_movement_snapshots;
CREATE POLICY "rls_tenant_isolation" ON scm.wms_inventory_movement_snapshots AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.wms_inventory_snapshots;
CREATE POLICY "rls_tenant_isolation" ON scm.wms_inventory_snapshots AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.wms_outbound_order_snapshots;
CREATE POLICY "rls_tenant_isolation" ON scm.wms_outbound_order_snapshots AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON scm.wms_replenishment_suggestion_snapshots;
CREATE POLICY "rls_tenant_isolation" ON scm.wms_replenishment_suggestion_snapshots AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
